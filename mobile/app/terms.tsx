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

export default function TermsScreen() {

  const router = useRouter();
  const { colors } = useTheme();


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
          Terms & Conditions
        </Text>

        <View
          style={{
            width: 26,
          }}
        />

      </View>


      <ScrollView
        contentContainerStyle={styles.content}
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
          SwiftCare Terms & Conditions
        </Text>


        <Text
          style={[
            styles.text,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          By using SwiftCare, you agree to these
          terms and conditions. Please read them
          carefully before using our healthcare
          services.
        </Text>



        <Section
          title="1. Use of SwiftCare"
          text="SwiftCare provides digital healthcare services including appointment management, queue tracking, medical information access and communication between patients and healthcare providers."
          colors={colors}
        />


        <Section
          title="2. Medical Disclaimer"
          text="SwiftCare supports healthcare delivery but does not replace professional medical advice, diagnosis or emergency medical services."
          colors={colors}
        />


        <Section
          title="3. User Responsibilities"
          text="Users must provide accurate information, protect their account credentials and use the platform responsibly."
          colors={colors}
        />


        <Section
          title="4. Account Security"
          text="You are responsible for maintaining the confidentiality of your account information. Contact SwiftCare if you suspect unauthorized access."
          colors={colors}
        />


        <Section
          title="5. Service Availability"
          text="SwiftCare may update, improve or temporarily modify services to maintain reliability and security."
          colors={colors}
        />


        <Section
          title="6. Updates to Terms"
          text="SwiftCare may revise these terms when necessary. Continued use of the application means you accept updated terms."
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
    <View
      style={styles.section}
    >

      <Text
        style={[
          styles.sectionTitle,
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
          styles.text,
          {
            color:
              colors.textSecondary,
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