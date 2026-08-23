import { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, onAuthStateChanged, signOut } from "../src/services/firebaseService";

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [rol, setRol] = useState(null);
    const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            try {
                // Validacion del usuario
                await firebaseUser.reload();

                setUser(firebaseUser);

                const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid));

                if (snap.exists()) {
                    setRol(snap.data().rol);
                } else {
                    // 🔥 Usuario no existe en Firestore
                    await signOut(auth);
                    setUser(null);
                    setRol(null);
                }

            } catch (error) {
                // 🔥 Usuario eliminado de Firebase Auth
                console.log("Usuario ya no existe:", error);

                await signOut(auth);
                setUser(null);
                setRol(null);
            }
        } else {
            setUser(null);
            setRol(null);
        }

        setLoading(false);
    });

    return unsubscribe;
}, []);

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setRol(null);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const value = {
        user,
        rol,
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