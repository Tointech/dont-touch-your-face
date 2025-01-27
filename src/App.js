import React, { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import { Howl } from 'howler'; 
import './App.css';
import { setdiff1dAsync } from '@tensorflow/tfjs';
import { initNotifications, notify } from '@mycv/f8-notification';
import soundURL from './assets/hey_sound.mp3'

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);


  const init = async () => {
    console.log('init...');
    await setupCamera();
    console.log('Load camera success');
  
    mobilenetModule.current = await mobilenet.load();
    
    classifier.current = knnClassifier.create();
  
    console.log('Setup done');
    console.log("Don't touch your face and press Train 1");
    
    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia || 
      navigator.webkitGetUserMedia || 
      navigator.mozGetUserMedia || 
      navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true},
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    });
  }

  const train = async label => {
    console.log('Training your face');
    for (let i = 0; i < TRAINING_TIMES; ++i) {
      console.log('Progress...');

      await training(label);     
    }

  }

  /** 
   * B1: Train cho may khuon mat khong cham tay
   * B2: Train cho may khuon mat co cham tay
   * B3: Lay hinh anh hien tai, phan tich va so sanh voi data da hoc truoc do
   * => Neu ma matching voi data khuon mat bi cham tay ==> Canh bao
   */

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    
    // console.log('Label: ', result.label);
    // console.log('Confidences: ', result.confidences);
    
    if (
      result.label == TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCH_CONFIDENCE
    ) {
      console.log('Touched');
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify("Don't touch", { body: 'You just touch your face!' });
      setTouched(true);
    } else {
      console.log('Not Touch');
      setTouched(false);
    }

    await sleep(200);

    run();
  }

  const sleep = (ms = 0) => {
    return new Promise((resolve => setTimeout(resolve, ms)))
  }

  useEffect (() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true;
    });

    // clean up
    return () => {

    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // change web title
  useEffect(() => {
    document.title = "Dont Touch Your Face"
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <h2>Avoid touching your face while working</h2>
      
      <video
        ref = {video}
        className="video"
        autoPlay
      />

      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train Not Touch</button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train Touch</button>
        <button className="btn" onClick={() => run()}>Run</button>
      </div>

      <div className="footer">
        <h5>©2021 Le Anh Thu</h5>
      </div>
    </div>
  );
}

export default App;
