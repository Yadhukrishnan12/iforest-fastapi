import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from fastapi import HTTPException

try:
    import tensorflow as tf
    from tensorflow.keras import layers, Input
    from tensorflow.keras.models import Model
except Exception:
    tf = None
    Model = None


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
