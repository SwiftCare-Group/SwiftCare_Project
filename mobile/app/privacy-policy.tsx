import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen() {

  const router = useRouter();
  const { colors } = useTheme();


  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
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
              color: colors.textPrimary,
            },
          ]}
        >
          Privacy Policy
        </Text>

        <View style={{width:26}} />

      </View>


      <ScrollView
        contentContainerStyle={styles.content}
      >

        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          SwiftCare Privacy Policy
        </Text>


        <Text
          style={[
            styles.text,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          SwiftCare respects your privacy and is
          committed to protecting your personal and
          healthcare information.
        </Text>


        <Section
          title="Information We Collect"
          text="We collect information required to provide healthcare services including your profile details, appointments, medical records, prescriptions and health information."
          colors={colors}
        />


        <Section
          title="How We Use Your Information"
          text="Your information is used to manage appointments, improve healthcare delivery, provide notifications and support communication between patients and healthcare providers."
          colors={colors}
        />


        <Section
          title="Data Protection"
          text="SwiftCare uses security measures to protect your information from unauthorized access, modification or disclosure."
          colors={colors}
        />


        <Section
          title="Your Rights"
          text="You may request access, correction or deletion of your personal information according to applicable privacy laws."
          colors={colors}
        />


      </ScrollView>

    </SafeAreaView>
  );
}



function Section({
  title,
  text,
  colors,
}: any) {

  return (
    <View style={styles.section}>

      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>


      <Text
        style={[
          styles.text,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {text}
      </Text>

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

title:{
fontSize:20,
fontWeight:'800',
marginBottom:15,
},

section:{
marginTop:20,
},

sectionTitle:{
fontSize:15,
fontWeight:'700',
marginBottom:8,
},

text:{
fontSize:14,
lineHeight:21,
},

});