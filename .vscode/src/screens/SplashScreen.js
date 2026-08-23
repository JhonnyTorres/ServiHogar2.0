import colors from "../constants/colors";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const SplashScreen = () => {
    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoCircle}>
                    <Ionicons name="home" size={40} color="#fff" />
                </View>
                <Text style={styles.appName}>ServiHogar</Text>
                <Text style={styles.appSub}>Servicios para el hogar</Text>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    appName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    appSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },
});

export default SplashScreen;
