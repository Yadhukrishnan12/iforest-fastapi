import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Shield } from 'lucide-react';
import App from './App';
import SanitizationTest from './SanitizationTest';

function AppRouter() {
    const [currentPage, setCurrentPage] = useState('anomaly'); // 'anomaly' or 'sanitization'

    return (
        <div>
            {/* Navigation */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    zIndex: 100,
                    display: 'flex',
                    gap: '0.5rem',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '9999px',
                    padding: '0.5rem'
                }}
            >
               {/* <NavButton
                    active={currentPage === 'anomaly'}
                    onClick={() => setCurrentPage('anomaly')}
                    icon={<BarChart2 size={18} />}
                    label="Anomaly Detection"
                />
                <NavButton
                    active={currentPage === 'sanitization'}
                    onClick={() => setCurrentPage('sanitization')}
                    icon={<Shield size={18} />}
                    label="Sanitization Test"
                />*/}
            </motion.div>

            {/* Page Content */}
            <div style={{ paddingTop: currentPage === 'anomaly' ? '0' : '0' }}>
                {currentPage === 'anomaly' ? <App /> : <SanitizationTest />}
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: active
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'transparent',
                color: active ? 'white' : '#94a3b8',
                borderRadius: '9999px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.background = 'transparent';
                }
            }}
        >
            {icon}
            <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        </button>
    );
}

export default AppRouter;
