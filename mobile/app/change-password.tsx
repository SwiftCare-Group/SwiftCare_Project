import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [showCurrent, setShowCurrent] =
    useState(false);

  const [showNew, setShowNew] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);


  const handleChangePassword = async () => {

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill all fields.'
      );
      return;
    }


    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'New passwords do not match.'
      );
      return;
    }


    if (newPassword.length < 8) {
      Alert.alert(
        'Weak Password',
        'Password must contain at least 8 characters.'
      );
      return;
    }


    setLoading(true);

    try {
      await api.put(
        '/patients/me/password',
        {
          currentPassword,
          newPassword,
        }
      );


      Alert.alert(
        'Success',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );


    } catch (error: any) {

      Alert.alert(
        'Change Failed',
        error.response?.data?.message ||
        'Unable to change password.'
      );

    } finally {
      setLoading(false);
    }
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

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={colors.textPrimary}
          />
        </TouchableOpacity>


        <Text
          style={[
            styles.headerTitle,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Change Password
        </Text>


        <View style={{ width: 26 }} />

      </View>



      <View style={styles.content}>

        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor:
                colors.primaryLight,
            },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={32}
            color={colors.primary}
          />
        </View>


        <Text
          style={[
            styles.description,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          Create a new secure password for your
          SwiftCare account.
        </Text>



        <PasswordInput
          label="Current Password"
          value={currentPassword}
          setValue={setCurrentPassword}
          visible={showCurrent}
          setVisible={setShowCurrent}
          colors={colors}
        />


        <PasswordInput
          label="New Password"
          value={newPassword}
          setValue={setNewPassword}
          visible={showNew}
          setVisible={setShowNew}
          colors={colors}
        />


        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          setValue={setConfirmPassword}
          visible={showConfirm}
          setVisible={setShowConfirm}
          colors={colors}
        />



        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          disabled={loading}
          onPress={handleChangePassword}
        >

          {
            loading ? (
              <ActivityIndicator
                color={colors.white}
              />
            ) : (
              <Text style={styles.buttonText}>
                Update Password
              </Text>
            )
          }

        </TouchableOpacity>


      </View>

    </SafeAreaView>
  );
}



function PasswordInput({
  label,
  value,
  setValue,
  visible,
  setVisible,
  colors,
}: any) {

  return (
    <View style={styles.inputGroup}>

      <Text
        style={[
          styles.label,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>


      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >

        <TextInput
          style={[
            styles.input,
            {
              color:
                colors.textPrimary,
            },
          ]}
          value={value}
          onChangeText={setValue}
          secureTextEntry={!visible}
          placeholder={label}
          placeholderTextColor={
            colors.textDisabled
          }
        />


        <TouchableOpacity
          onPress={() =>
            setVisible(!visible)
          }
        >

          <Ionicons
            name={
              visible
                ? 'eye-outline'
                : 'eye-off-outline'
            }
            size={20}
            color={
              colors.textSecondary
            }
          />

        </TouchableOpacity>

      </View>

    </View>
  );
}



const styles = StyleSheet.create({

  container:{
    flex:1,
  },


  header:{
    height:60,
    borderBottomWidth:1,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal:18,
  },


  headerTitle:{
    fontSize:18,
    fontWeight:'700',
  },


  content:{
    padding:20,
  },


  iconCircle:{
    width:80,
    height:80,
    borderRadius:40,
    alignSelf:'center',
    alignItems:'center',
    justifyContent:'center',
    marginBottom:20,
  },


  description:{
    textAlign:'center',
    fontSize:13,
    lineHeight:20,
    marginBottom:25,
  },


  inputGroup:{
    marginBottom:16,
  },


  label:{
    fontSize:13,
    fontWeight:'600',
    marginBottom:8,
  },


  inputContainer:{
    height:52,
    borderWidth:1,
    borderRadius:12,
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:14,
  },


  input:{
    flex:1,
    fontSize:14,
  },


  button:{
    height:52,
    borderRadius:12,
    justifyContent:'center',
    alignItems:'center',
    marginTop:15,
  },


  buttonText:{
    color:'#fff',
    fontSize:15,
    fontWeight:'700',
  },

});