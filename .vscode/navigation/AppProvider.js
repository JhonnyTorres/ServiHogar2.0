import { useEffect, useState } from "react"
import sqliteService from '../src/services/sqliteService';
import { ActivityIndicator, View } from "react-native";

const AppProvider =({children}) =>{
    const [ready, setReady] = useState(false);

    useEffect(()=>{
        let mounted = true;
        const init = async() =>{
            try {
                await sqliteService.init();
            } catch (e) {
                console.warn('Mensaje con el error');
            }finally{
                if (mounted) setReady(true);
            }
        }
        init();
        return ()=>{mounted= false}
    },[]);

    if (!ready){
        return(
            <View style ={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size = "large"/>
            </View>
        )
    }
    return children;
}

export default AppProvider