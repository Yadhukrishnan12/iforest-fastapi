import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from fastapi import HTTPException

try:
    import tensorflow as tf
    from tensorflow.keras import layers, Input
    from tensorflow.keras.models import Model
    from tensorflow.keras.callbacks import EarlyStopping
except Exception:
    tf = None
    Model = None

try:
    from sklearn.preprocessing import StandardScaler
except Exception:
    StandardScaler = None

def _build_mappings(df: pd.DataFrame, cat_cols: List[str]) -> Dict[str, Dict[str, int]]:
    mappings = {}
    for col in cat_cols:
        uniq = df[col].fillna("__NA__").astype(str).unique()
        mappings[col] = {v: i + 1 for i, v in enumerate(uniq)}
    return mappings


def _encode_df(df, mappings, cat_cols):
    inputs = {}
    for col in cat_cols:
        inputs[col] = (
            df[col]
            .fillna("__NA__")
            .astype(str)
            .map(mappings[col])
            .fillna(0)
            .astype(int)
            .values.reshape(-1, 1)
        )
    return inputs


def _build_model(
    cat_vocab: Dict[str, int],
    embedding_dims: Dict[str, int],
) -> Tuple["Model", List[str]]:

    inputs, embeds = [], []

    for col, vocab in cat_vocab.items():
        inp = Input(shape=(1,), dtype="int32", name=f"in_{col}")
        emb = layers.Embedding(vocab + 1, embedding_dims[col])(inp)
        emb = layers.Flatten()(emb)
        inputs.append(inp)
        embeds.append(emb)

    x = layers.Concatenate()(embeds)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dense(64, activation="relu")(x)

    outputs = [
        layers.Dense(vocab + 1, activation="softmax", name=f"out_{col}")(x)
        for col, vocab in cat_vocab.items()
    ]

    model = Model(inputs=inputs, outputs=outputs)
    model.compile(
        optimizer="adam",
        loss={f"out_{col}": "sparse_categorical_crossentropy" for col in cat_vocab},
    )

    return model, list(cat_vocab.keys())


def detect_categorical_anomalies(
    df: pd.DataFrame,
    epochs: int = 8,
    batch_size: int = 256,
    threshold_percentile: float = 95.0,
) -> Dict[str, Any]:

    if tf is None:
        raise HTTPException(500, "TensorFlow not installed")

    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    if not cat_cols:
        raise HTTPException(400, "No categorical columns found")

    mappings = _build_mappings(df, cat_cols)
    cat_vocab = {c: len(mappings[c]) for c in cat_cols}
    embed_dims = {c: min(50, max(2, v // 2)) for c, v in cat_vocab.items()}

    X = _encode_df(df, mappings, cat_cols)
    y = {f"out_{c}": X[c] for c in cat_cols}

    model, _ = _build_model(cat_vocab, embed_dims)

    model.fit(
        [X[c] for c in cat_cols],
        y,
        epochs=epochs,
        batch_size=batch_size,
        verbose=0,
    )

    preds = model.predict([X[c] for c in cat_cols], verbose=0)

    n = len(df)
    losses = np.zeros((n, len(cat_cols)))

    for i, col in enumerate(cat_cols):
        probs = preds[i]
        true_idx = X[col].reshape(-1)
        p = np.clip(probs[np.arange(n), true_idx], 1e-12, 1.0)
        losses[:, i] = -np.log(p)

    scores = losses.sum(axis=1)
    thresh = np.percentile(scores, threshold_percentile)

    anomalies = []
    for i in np.where(scores > thresh)[0]:
        anomalies.append({
            **df.iloc[i].to_dict(),
            "score": float(scores[i]),
            "per_feature": sorted(
                [
                    {"feature": cat_cols[j], "loss": float(losses[i, j])}
                    for j in range(len(cat_cols))
                ],
                key=lambda x: x["loss"],
                reverse=True,
            ),
        })

    return {
        "anomalies": anomalies,
        "metadata": {
            "method": "categorical_autoencoder",
            "threshold": float(thresh),
            "categorical_columns": cat_cols,
        },
    }


def detect_numeric_anomalies_autoencoder(
    df: pd.DataFrame,
    epochs: int = 30,
    batch_size: int = 256,
    threshold_percentile: float = 95.0,
    validation_split: float = 0.1,
    random_state: int = 42,
) -> Dict[str, Any]:

    if tf is None:
        raise HTTPException(500, "TensorFlow not installed")
    if StandardScaler is None:
        raise HTTPException(500, "scikit-learn not installed")

    X = df.select_dtypes(include=[np.number]).copy()
    if X.shape[1] == 0:
        raise HTTPException(400, "No numeric columns found")

    X = X.replace([np.inf, -np.inf], np.nan).dropna(axis=0, how="any")
    if X.empty:
        raise HTTPException(400, "No usable rows after cleaning numeric data")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X.values.astype("float32"))

    n_features = X_scaled.shape[1]
    tf.random.set_seed(random_state)

    inp = Input(shape=(n_features,), name="x")
    x = layers.Dense(min(128, max(16, n_features * 2)), activation="relu")(inp)
    x = layers.Dense(min(64, max(8, n_features)), activation="relu")(x)
    bottleneck = layers.Dense(min(32, max(4, n_features // 2)), activation="relu")(x)
    x = layers.Dense(min(64, max(8, n_features)), activation="relu")(bottleneck)
    x = layers.Dense(min(128, max(16, n_features * 2)), activation="relu")(x)
    out = layers.Dense(n_features, activation="linear", name="x_hat")(x)

    model = Model(inputs=inp, outputs=out)
    model.compile(optimizer="adam", loss="mse")

    callbacks = []
    if validation_split and validation_split > 0:
        callbacks.append(EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True))

    model.fit(
        X_scaled,
        X_scaled,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=validation_split if validation_split and validation_split > 0 else 0.0,
        callbacks=callbacks,
        verbose=0,
        shuffle=True,
    )

    X_hat = model.predict(X_scaled, verbose=0)
    per_feature = np.square(X_scaled - X_hat)
    scores = per_feature.mean(axis=1)

    thresh = float(np.percentile(scores, threshold_percentile))
    anomaly_mask = scores > thresh

    anomalies = []
    idxs = np.where(anomaly_mask)[0]
    cols = X.columns.tolist()

    for row_pos in idxs:
        contrib = per_feature[row_pos]
        top = sorted(
            [{"feature": cols[j], "recon_error": float(contrib[j])} for j in range(len(cols))],
            key=lambda x: x["recon_error"],
            reverse=True,
        )
        original_row = df.loc[X.index[row_pos]].to_dict()
        anomalies.append(
            {
                **original_row,
                "score": float(scores[row_pos]),
                "per_feature": top,
            }
        )

    return {
        "anomalies": anomalies,
        "metadata": {
            "method": "numeric_autoencoder",
            "threshold": thresh,
            "numeric_columns": cols,
            "rows_used": int(X.shape[0]),
            "features_used": int(len(cols)),
        },
    }
