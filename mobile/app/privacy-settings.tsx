import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_KEY = 'swiftcarePrivacySettings';

type PrivacySettings = {
  medicalDataSharing: boolean;
  analyticsSharing: boolean;
  healthRecommendations: boolean;
};

const DEFAULT_PRIVACY: PrivacySettings = {
  medicalDataSharing: true,
  analyticsSharing: false,
  healthRecommendations: true,
};

export default function PrivacySettingsScreen() {

  const router = useRouter();

  const { colors } = useTheme();

  const [settings, setSettings] =
    useState<PrivacySettings>(
      DEFAULT_PRIVACY
    );


  useEffect(() => {
    loadSettings();
  }, []);


  const loadSettings = async () => {
    try {

      const saved =
        await AsyncStorage.getItem(
          PRIVACY_KEY
        );

      if (saved) {
        setSettings({
          ...DEFAULT_PRIVACY,
          ...JSON.parse(saved),
        });
      }

    } catch(error) {
      console.log(
        'Failed loading privacy settings',
        error
      );
    }
  };


  const updateSetting = async (
    key: keyof PrivacySettings,
    value: boolean
  ) => {

    const updated = {
      ...settings,
      [key]: value,
    };

    setSettings(updated);

    await AsyncStorage.setItem(
      PRIVACY_KEY,
      JSON.stringify(updated)
    );
  };


  return (

    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >

      <View
        style={[
          styles.header,
          {
            backgroundColor:
              colors.surface,
            borderBottomColor:
              colors.border,
          },
        ]}
      >

        <Ionicons
          name="chevron-back"
          size={26}
          color={colors.textPrimary}
          onPress={() => router.back()}
        />


        <Text
          style={[
            styles.headerTitle,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Privacy Settings
        </Text>


        <View
          style={{
            width:26
          }}
        />

      </View>


      <ScrollView
        contentContainerStyle={styles.content}
      >


        <Text
          style={[
            styles.description,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          Control how SwiftCare uses and shares
          your healthcare information.
        </Text>



        <PrivacyItem

          icon="medical-outline"

          title="Medical Data Sharing"

          subtitle="Allow healthcare providers to access your medical records"

          value={
            settings.medicalDataSharing
          }

onChange={(value: boolean) =>
  updateSetting(
    'medicalDataSharing',
    value
  )
}          colors={colors}

        />



        <PrivacyItem

          icon="analytics-outline"

          title="Analytics Sharing"

          subtitle="Help improve SwiftCare by sharing anonymous usage data"

          value={
            settings.analyticsSharing
          }

onChange={(value: boolean) =>
  updateSetting(
    'analyticsSharing',
    value
  )
}
          colors={colors}

        />



        <PrivacyItem

          icon="heart-outline"

          title="Health Recommendations"

          subtitle="Receive personalized healthcare suggestions"

          value={
            settings.healthRecommendations
          }

onChange={(value: boolean) =>
  updateSetting(
    'healthRecommendations',
    value
  )
}
          colors={colors}

        />


      </ScrollView>


    </SafeAreaView>

  );
}



function PrivacyItem({
  icon,
  title,
  subtitle,
  value,
  onChange,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  colors: any;
}) {return(

<View
style={[
styles.card,
{
backgroundColor:
colors.surface,

borderColor:
colors.border,
},
]}
>

<View
style={styles.left}
>

<View
style={[
styles.iconBox,
{
backgroundColor:
colors.primaryLight,
},
]}
>

<Ionicons
name={icon}
size={20}
color={colors.primary}
/>

</View>


<View
style={styles.textContainer}
>

<Text
style={[
styles.title,
{
color:
colors.textPrimary,
},
]}
>
{title}
</Text>


<Text
style={[
styles.subtitle,
{
color:
colors.textSecondary,
},
]}
>
{subtitle}
</Text>


</View>

</View>



<Switch

value={value}

onValueChange={onChange}

trackColor={{
false:
colors.border,

true:
colors.primaryMuted,
}}

thumbColor={
value
?
colors.primary
:
colors.textDisabled
}

/>


</View>

);

}



const styles = StyleSheet.create({

container:{
flex:1,
},


header:{
height:60,
flexDirection:'row',
alignItems:'center',
justifyContent:'space-between',
paddingHorizontal:18,
borderBottomWidth:1,
},


headerTitle:{
fontSize:18,
fontWeight:'700',
},


content:{
padding:20,
},


description:{
fontSize:14,
lineHeight:20,
marginBottom:20,
},


card:{
borderWidth:1,
borderRadius:15,
padding:16,
marginBottom:14,
flexDirection:'row',
alignItems:'center',
justifyContent:'space-between',
},


left:{
flexDirection:'row',
alignItems:'center',
flex:1,
},


iconBox:{
height:42,
width:42,
borderRadius:12,
alignItems:'center',
justifyContent:'center',
marginRight:12,
},


textContainer:{
flex:1,
},


title:{
fontSize:15,
fontWeight:'700',
},


subtitle:{
fontSize:12,
lineHeight:17,
marginTop:3,
},


});