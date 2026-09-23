import { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth, db, onAuthStateChanged } from "../src/services/firebaseService";
import sqliteService from "../src/services/sqliteService";

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [rol, setRol] = useState(null);
    const [emailVerified, setEmailVerified] = useState(false);
    const [loading, setLoading] = useState(true);

    // ── Escuchar cambios de autenticación ─────────────────────────────────────
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                setEmailVerified(firebaseUser.emailVerified);

                if (firebaseUser.emailVerified) {
                    try {
                        const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
                        setRol(snap.exists() ? snap.data().rol : null);
                    } catch (error) {
                        console.error('Error al obtener el rol:', error);
                        setRol(null);
                    }
                } else {
                    setRol(null);
                    // Intentar enviar verificación si aún no se ha enviado
                    try {
                        await sendEmailVerification(firebaseUser);
                    } catch (_) {
                        // Puede fallar si ya se envió recientemente — no es crítico
                    }
                }
            } else {
                setUser(null);
                setRol(null);
                setEmailVerified(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // ── Detectar cuando emailVerified cambia a true desde EmailVerificationScreen ──
    useEffect(() => {
        if (user?.emailVerified && !emailVerified) {
            setEmailVerified(true);
            // Cargar el rol ahora que el correo está verificado
            getDoc(doc(db, 'usuarios', user.uid))
                .then(snap => {
                    setRol(snap.exists() ? snap.data().rol : null);
                })
                .catch(error => {
                    console.error('Error al cargar el rol tras verificación:', error);
                    setRol(null);
                });
        }
    }, [user]);

    // ── Cerrar sesión ─────────────────────────────────────────────────────────
    const logout = async () => {
        try {
            sqliteService.limpiarTodo();
            setRol(null);
            setUser(null);
            setEmailVerified(false);
            await signOut(auth);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const value = {
        user,
        rol,
        emailVerified,
        setUser,
        logout,
        loading,
        setLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};