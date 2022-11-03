import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  useColorScheme,
  View,
  Dimensions,
  TextInput,
  Button,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import rnfb from 'rn-fetch-blob';
import {PermissionsAndroid} from 'react-native';
import Peer from 'react-native-peerjs';
import DocumentPicker from 'react-native-document-picker';

const getPermissionExternalStorage = async () => {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  const rgranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  );
  return (
    granted === PermissionsAndroid.RESULTS.GRANTED &&
    rgranted === PermissionsAndroid.RESULTS.GRANTED
  );
};

let localPeer;
const App = () => {
  const [id, setId] = useState('');
  const [remoteId, setRemoteId] = useState('');
  const [picked, setPicked] = useState({});
  const [info, setInfo] = useState('not started');
  const isDarkMode = useColorScheme() === 'dark';
  const windowHeight = Dimensions.get('window').height;
  const dir = rnfb.fs.dirs.DownloadDir;

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect(() => {
    (async () => {
      await getPermissionExternalStorage();
      localPeer = new Peer();
      localPeer.on('open', localPeerId => {
        console.log('Local peer open with ID', localPeerId);
        setId(localPeerId);
      });

      localPeer.on('connection', conn => {
        conn.on('open', async () => {
          const stream = await rnfb.fs.readStream(
            dir + '/app-debug.apk',
            'base64',
          );
          stream.open();
          stream.onData(chunk => {
            conn.send(chunk);
          });
          stream.onEnd(() => {
            conn.send('EOF!!!');
          });
        });
        conn.on('close', () => {
          console.log('closed');
        });
      });
    })();
  }, []);

  async function connectToRemotePeer() {
    const remotePeer = new Peer();

    remotePeer.on('open', async id => {
      const conn = remotePeer.connect(remoteId, {
        reliable: true,
        serialization: 'none',
      });

      const wStream = await rnfb.fs.writeStream(dir + '/ok.mp4', 'base64');

      conn.on('open', () => {
        setInfo('conn open');
        conn.on('data', data => {
          if (data.includes('EOF!!!')) {
            wStream.close();
            conn.close();
          } else {
            wStream.write(data);
          }
        });
      });

      conn.on('close', () => {
        setInfo('done');
      });
    });
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
            height: windowHeight,
            display: 'flex',
            alignItems: 'center',
            paddingTop: 20,
          }}>
          <Text style={{fontSize: 20, margin: 'auto', marginBottom: 20}}>
            Meepo
          </Text>
          <Text style={{fontSize: 20, marginTop: 10, marginBottom: 20}}>
            File Choosen: {picked && picked.name}
          </Text>
          <Button
            title="choose file"
            onPress={async () => {
              setPicked(await DocumentPicker.pickSingle());
            }}></Button>
          <Text style={{fontSize: 20, margin: 'auto', marginTop: 30}}>
            Your ID :
          </Text>
          <Text style={{fontSize: 20, marginTop: 10}} selectable={true}>
            {id}
          </Text>

          <Text style={{fontSize: 20, margin: 'auto', marginTop: 100}}>
            Remote ID :
          </Text>
          <View
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
              marginTop: 30,
            }}>
            <Text style={{fontSize: 20, margin: 'auto'}}>Enter ID :</Text>
            <TextInput
              onChangeText={text => {
                setRemoteId(text);
              }}
              style={{
                borderColor: 'gray',
                width: '70%',
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
                color: 'black',
                backgroundColor: 'white',
              }}></TextInput>
          </View>
          <View style={{width: '50%', marginTop: 30}}>
            <Button onPress={connectToRemotePeer} title="Go!"></Button>
          </View>
          <Text style={{marginTop: 20, fontSize: 20}}>{info}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
