import { Client } from './../../models/client';
import { phpServices } from './../services/phpServices';
import { UserQueue } from './../../models/userQueue';
import { Component, OnInit } from '@angular/core';
import { NavParams, AlertController, NavController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import { Vibration } from '@ionic-native/vibration';
import { NativeAudio } from '@ionic-native/native-audio';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'page-eachQueue',
  templateUrl: 'eachQueue.html'
})

export class EachQueuePage implements OnInit {
  private autoRetrieveInterval: number = 5000 //Set the loop duration the DB will be queried for any changes 
  private head: number = 3; //Number of extra rows received by  this.phpSrvc.phpQRet  before the actual names of the customers
  public queues: UserQueue[];  // The whole queues array
  private queue: UserQueue;    // This specific queue
  private selectedCustomer: Array<number> = [];
  private received: boolean = false;
  private receivedMsg: string = '';
  private previousMsgDate: string = '';
  private dateLocal: string;
  private timeZone; //Variable to hold the time-zone read from internal storage
  indx: number;
  notify: boolean = true;
  favIndex: number = -1; //To store the index of the clicked client. Initially set as -1
  customerList: Client[] = [];
  observableRetrieve: Subscription; //import Subscription & use so setInterval only works on this page and does not keep working under others
  observableNot: Subscription; //Use anoth subscription for vibration & audio notification, so they work only on this page and can be unsubscribed
  lastCustServed: number = -1;
  favWaitTime: number = 0;
  startSelected: number = 0;
  endSelected: number = 0;
  favCustName: string;
  private startText: string = '- Start -';
  private endText: string = '- End -';
  private savedPasscode: string;
  private dbPasscode: string;
  private languages: string;
  private viewReady: boolean = false;

  vibrateOn: boolean; //Leave these UNDEFINED initially and retrieve corresponding values from storage on every ionViewWillEnter
  soundOn: boolean; //Leave these UNDEFINED initially and retrieve corresponding values from storage on every ionViewWillEnter 

  constructor(private navParams: NavParams,
    public phpSrvc: phpServices,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private storage: Storage,
    private vibration: Vibration,
    private nativeAudio: NativeAudio,
    private translate: TranslateService) { }

  ngOnInit() {
    this.queues = this.navParams.get('q');
    this.indx = this.navParams.get('i');
    this.queue = this.queues[this.indx]; // Get the specific queue being viewed
    this.savedPasscode = this.queues[this.indx].passcode;    
  }

  ionViewWillEnter() {
    this.notify = true; //Reset the notify flag on ever viewEnter
    this.getLanguage();
    this.getTimeZone();
    this.getVibSet(); //Get the vibration setting & set the vibrateOn variable
    this.getSoundSet(); //Get the sound setting & set the soundOn variable

    //Preload the audio notification to notify the user so it can be used immediately when needed
    this.nativeAudio.preloadSimple('uuidAudio', 'assets/sound/defaultNotify.mp3')
      .then(onSuccess => {
        //console.log('Audio notification preloaded successfully');
      }, onError => {
        console.log('Could not load audio: ' + onError);
      });

    //Preload the audio notification to notify the user so it can be used immediately when needed
    this.nativeAudio.preloadSimple('msgAudio', 'assets/sound/msg.mp3')
      .then(onSuccess => {
        //console.log('Audio notification preloaded successfully');
      }, onError => {
        console.log('Could not load audio: ' + onError);
      });

    this.queueMain(); // Get the "marked" customer for this room, go in a repeating loop and check for the selected customer and any changes in customer list 
  }

  ionViewWillLeave() { //Unsubscribe from the observable and interval
    if (this.observableRetrieve != undefined) {
      this.observableRetrieve.unsubscribe();
    }

    if (this.observableNot != undefined) {
      this.observableNot.unsubscribe();   //Unsubscribe from the vibration/audio obervable as well
    }
    this.viewReady = false;

    //this.navCtrl.pop(); //So the current queue is closed if we leave the page and upon return to the QUEUES tab, we see the main Queues page
  }

  onDeleteQueue() {
    const prompt = this.alertCtrl.create({
      title: 'Delete queue?',
      buttons: [
        {
          text: 'Cancel',
          handler: data => {
            //console.log('Cancel clicked');
          }
        },
        {
          text: 'Delete',
          handler: data => {
            this.deleteFavourite(); //Delete the stored key
            let navTransition = prompt.dismiss();  //Info about how to use navCtrl.pop inside an alertCtrl: https://ionicframework.com/docs/api/components/alert/AlertController/#advanced
            this.queues.splice(this.indx, 1); //Remove the queue from the array            
            this.storage.set('queues', this.queues) //Set overrides the data in the storage
              .then(
                data => {
                  console.log('Queue deleted successfully');
                  navTransition.then(() => {
                    this.navCtrl.pop(); //Return to the Queues page
                  })
                }
              )
              .catch(
                err => {
                  console.log('Could not update the saved queue list!')
                }
              );
            this.storage.remove('q' + this.queue.name) //Remove the queue logo saved as base64 file (if the defaultimg was used this will end with an error)
              .then(
                _ => {
                  //console.log('Queue removed!')
                }
              )
              .catch(
                err => {
                  console.log(err);
                }
              );
            return false;
          }
        }
      ]
    });
    prompt.present();
  }

  onClickCust(indx: number) {
    this.favIndex = (this.favIndex == indx ? -1 : indx); //Toggle this.favIndex between -1 and the index, so it gets unselected if pressed the second time                                                    
    this.notify = true; //Reset the notify flag whenever there were any changes to the selected/favourite customer
    if (this.favIndex == -1) {
      this.deleteFavourite();
    } else {                                             //Each customer name is unique (users ar enot allowed to add the same name on he front end)
      this.favCustName = this.customerList[indx].name;   //so store customer name, so when the list is reordered, look for the new name position and adjust the favIndex 
      this.storage.set(this.queue.name + 'fav', this.favCustName) //Set overrides the data in the storage
        .then(
          data => {
            this.calcWaitTime();
            //console.log(this.favIndex);
          }
        )
        .catch(
          err => {
            //this.favIndex = (this.favIndex == indx ? -1 : indx);  //Toggle back the selection
            console.log('Could not save the selection!')
            console.log(err);
          }
        );
    }
  }

  isItYourTurn() {
    this.lastCustServed = -1; 
    for (let n = 0; n < this.selectedCustomer.length; n++) {
      if (this.selectedCustomer[n] == 1) {
        this.lastCustServed = n;  //Get the index of the last customer that got served (i.e. turned "green" on the page)
      } 
    }
    if ((this.favIndex != -1) && this.notify) {
      if (this.lastCustServed == -1) { //If there are no selected customers, just check if "Start" is selected so you can notify the very first user
        if (this.startSelected == 1 && this.favIndex == 0) { //If the very first user is selected (favIndex=0), notify the user when START is selected
          this.notifyUser();
          this.notify = false;
        }
      } else if (this.lastCustServed == this.favIndex - 1) { // Check if the previous customer is served (turned green), if so notify the user
        this.notifyUser();
        this.notify = false;
      }
    }

    if (this.lastCustServed < this.favIndex - 1 || this.favIndex == -1) { //Reset the notification flag if the served customers are reset, or if the user unmakrs and then marks again the contact
      this.notify = true;
    }
  }

  notifyUser() {
    const prompt = this.alertCtrl.create({
      enableBackdropDismiss: false, //Alert can only be dismissed if the OK button is clicked on (there was an issue with onDidDismiss not getting called when background was clicked)
      title: 'Your turn!',
      cssClass: 'buttonCss', //Alert Controller is not a child of this page, so the CSS changes are on app.scss file
      buttons: [
        {
          text: 'OK',
          //role: 'Cancel',
          cssClass: 'okButton',
          handler: data => {
          }
        }
      ]
    });
    prompt.present();
    //First start vigration & audio, then start the loop (loop first does the delay, then starts executing, so need to vibrate/audio one more time bfore the loop)
    if (this.vibrateOn) {
      this.vibration.vibrate(1500); //Notify the user via vibration
    };
    if (this.soundOn) {
      this.nativeAudio.play('uuidAudio'); //Notify the user via audio 
    }
    prompt.onDidDismiss(() => { //onDidDismiss does not get fired when background is clicked on (bug?) so set  enableBackdropDismiss: false       
      this.vibration.vibrate(0);
      console.log('First prompt.onDidDismiss entered, SET FLAG HERE')
      this.observableNot.unsubscribe(); //Unsubscribe from the repeating obervable
    })

    this.observableNot = Observable.interval(3000).subscribe(() => {
      if (this.vibrateOn) {
        this.vibration.vibrate(1500); //Notify the user via vibration
      };
      if (this.soundOn) {
        this.nativeAudio.play('uuidAudio'); //Notify the user via audio 
      }
      prompt.onDidDismiss(() => { //onDidDismiss does not get fired when background is clicked on (bug?) so set  enableBackdropDismiss: false      
        this.vibration.vibrate(0);
        console.log('prompt.onDidDismiss entered, SET FLAG HERE')
        this.observableNot.unsubscribe(); //Unsubscribe from the repeating obervable
      })
    });
  }

  deleteFavourite() {
    this.storage.remove(this.queue.name + 'fav')
      .then(
        (savedFavIndex: number) => {
          this.favIndex = -1; //Remove the key:value from storage if the room is deleted and set the flag to -1
          this.favCustName = '';
        }
      )
      .catch(
        err => {
          console.log(err);
        }
      );
  }

  getVibSet() {
    this.storage.get('vibrateOn')
      .then((vibSet: boolean) => {
        if (vibSet == null) {
          this.vibrateOn = true; //If for some reason null is received, set the variable to true by default
        } else {
          this.vibrateOn = vibSet;
        }
      })
      .catch(err => {
        console.log(err);
        console.log('Could not retrieve the vibration setting');
        this.vibrateOn = true; //Set it to true in case of an error
      });
  }

  getSoundSet() {
    this.storage.get('soundOn')
      .then((soundSet: boolean) => {
        if (soundSet == null) {
          this.soundOn = true; //If for some reason null is received, set the variable to true by default
        } else {
          this.soundOn = soundSet;
        }
      })
      .catch(err => {
        console.log(err);
        console.log('Could not retrieve the vibration setting');
        this.soundOn = true; //Set it to true in case of an error
      });
  }

  calcWaitTime() { //Calcuate the wait time for the selected customer
    this.favWaitTime = 0;
    let tempTime = 0; //Use a temporary variable so this.favWaitTime does not get changed during the calculation and get displayed
    for (let i = 0; i < (this.favIndex + 1); i++) {
      tempTime += +this.customerList[i].waitTime; //Put a '+' infront of this.customerList so it is cast into a number
      if (this.customerList[i].waitTime == 0) {
        tempTime += 1; //If the waittime is 0 (meaning the measured time is <1min, assume 1 minute for the time calculation)
      }
    }

    for (let i = 0; i < this.selectedCustomer.length; i++) {
      if (this.selectedCustomer[i] == 1) {
        tempTime -= this.customerList[i].waitTime;
        if (this.customerList[i].waitTime == 0) {
          tempTime -= 1; //If the waittime is 0 (meaning the measured time is <1min, assume 1 minute for the time calculation)
        }
      }
    }

    if (tempTime < 0) {
      this.favWaitTime = 0;
    } else {
      this.favWaitTime = tempTime;
    }
  }

  setStartEndSelected(varS: number) {
    switch (varS) {
      case 1: {
        this.startSelected = 1;
        this.endSelected = 0;
        break;
      }
      case 2: {
        this.startSelected = 0;
        this.endSelected = 1;
        break;
      }
      case 3: {
        this.startSelected = 1;
        this.endSelected = 1;
        break;
      }
      default: {
        this.startSelected = 0;
        this.endSelected = 0;
        break;
      }
    }
  }

  queueMain() {
    this.storage.get(this.queue.name + 'fav') //Storing the name of the customer that was selected as the favourite. Customer names are unique as on the fronted duplicate names are not allowed
      .then(
        (savedFavCustName: string) => {
          if (savedFavCustName != null) {
            this.favCustName = savedFavCustName; //Get the name of the favourite cust so it's index can be retreived when the customerlist is retrieved
          } else { //If there are no favourites stored, set this.favIndex to -1 
            this.favCustName = '';
            this.favIndex = -1;
          }

          // First get the Start/End text
          this.phpSrvc.phpQRet(this.queue.name)
            .then(data => {
              //SQL command will return something like below:
              /*
                customer      wait                        selected  qorder
                Start         End                         1         -9
                Passcode      NULL                        NULL      -8
                Good Morning! 2019-01-13T19:21:01.145Z    NULL      -7
                Cust          1                           0         1
                Cust2         4                           0         2
                cUST3         2                           0         3
              */
              //Start/End text will always be at the top at data[0][0] and data[0][1] positions as qorder for it is set as -9 (SQL query is sorted by qorder column)
              //Passcode will always be passed at the data[1][0] position as qorder for it is set as -8
              //Message will always be passed at the data[2][0] position as qorder for it is set as -7
              //
              // If room gets deleted, data will be NULL
              //    Check if the room name got deleted, if yes, prompt a warning and go back on OK
              //    If room exists, check if passcode matches, if not, prompt and go back on OK
              if (data == null || data == undefined || data.length == 0) { //Either the room got deleted, room name changed
                this.navCtrl.pop(); //Go back to the main queues page, if the room name changed or room got deleted, user will get a prompt on this page
              } else {
                if (data.error == undefined) { //If an error is received during php connection, data will include an error object. If all fine, there won't be any error objects so it will be undefined
                  this.dbPasscode = data[1][0]; //Get the current passcode of the room
                  if (this.savedPasscode != this.dbPasscode) {
                    this.navCtrl.pop(); //Go back to the main queues page, as the room passcode changed, user will get a prompt on this page and the room will get deleted from the queues list
                  } else {
                    this.startText = data[0][0]; //First retrieve the start/end text, before the customer list is retrieved so the text are ready for display
                    this.endText = data[0][1];
                    if (this.startText == '' || this.startText == null) {
                      this.startText = '- Start -'
                    }
                    if (this.endText == '' || this.endText == null) {
                      this.endText = '- End -'
                    }
                    for (let i = this.head; i < data.length; i++) { //data is a 2 dimensional array of {customer, waitTime} in each row
                      this.customerList[i - this.head] = new Client(data[i][0], data[i][1]); //data[i][0] -> customer name, data[i][1] -> waitTime
                      if (data[i][0] == this.favCustName) { //Check if the the favourite name got reordered and reassign the favIndex
                        this.favIndex = i - this.head; //i is started from 3, so this.favIndex should be i-3
                      }
                    }
                    if (data.length-this.head < this.customerList.length) {
                      this.customerList.splice((data.length-this.head), (this.customerList.length-data.length+this.head)); //Delete any left over elements in the customerList array
                    }
                    this.downloadMessage(data[2][0], data[2][1]); //Pass "text" (i.e. message body) and "msg time" (in ISO format), set the message & time formats and warnings

                    let startEndVal = data[0][2]; //data[0][2] will be the Start/End selection info (0-3) 
                    this.setStartEndSelected(startEndVal);
                    for (let i = this.head; i < data.length; i++) {
                      this.selectedCustomer[i - this.head] = data[i][2];
                    }
                    this.calcWaitTime(); //Calculate wait time for the selected customer
                    this.isItYourTurn();
                    this.viewReady = true;

                    //******** REPEAT THE SAME ROUTINE ABOVE ********
                    //The above php request gets implemented immediately. The one below starts after the set time interval, so the one above
                    //prevents the room to load blank initially
                    // I want setInterval to work only on this page. Following: https://stackoverflow.com/questions/46743354/setinterval-in-ionic-3
                    this.observableRetrieve = Observable.interval(this.autoRetrieveInterval).subscribe(() => {
                      this.phpSrvc.phpQRet(this.queue.name)
                        .then(newList => {
                          if (newList == null || newList == undefined || newList.length == 0) { //Either the room got deleted, room name changed
                            this.navCtrl.pop(); //Go back to the main queues page, if the room name changed or room got deleted, user will get a prompt on this page
                          } else {
                            if (newList.error == undefined) { //If an error is received during php connection, data will include an error object. If all fine, there won't be any error objects so it will be undefined
                              this.dbPasscode = newList[1][0]; //Get the current passcode of the room
                              if (this.savedPasscode != this.dbPasscode) {
                                this.navCtrl.pop(); //Go back to the main queues page, as the room passcode changed, user will get a prompt on this page and the room will get deleted from the queues list
                              } else {
                                this.startText = newList[0][0]; //First retrieve the start/end text, before the customer list is retrieved so the text are ready for display
                                this.endText = newList[0][1];
                                if (this.startText == '' || this.startText == null) {
                                  this.startText = '- Start -'
                                }
                                if (this.endText == '' || this.endText == null) {
                                  this.endText = '- End -'
                                }
                                for (let i = this.head; i < newList.length; i++) { //data is a 2 dimensional array of {customer, waitTime} in each row
                                  this.customerList[i - this.head] = new Client(newList[i][0], newList[i][1]); //data[i][0] -> customer name, data[i][1] -> waitTime
                                  if (newList[i][0] == this.favCustName) { //Check if the the favourite name got reordered and reassign the favIndex
                                    this.favIndex = i - this.head; //i is started from 2, so this.favIndex should be i-2
                                  }
                                }
                                if (newList.length-this.head < this.customerList.length) {
                                  this.customerList.splice((newList.length-this.head), (this.customerList.length-newList.length+this.head)); //Delete any left over elements in the customerList array
                                }
                                this.downloadMessage(newList[2][0], newList[2][1]); //Pass "text" (i.e. message body) and "msg time" (in ISO format), set the message & time formats and warnings

                                let startEndVal = newList[0][2]; //data[0][2] will be the Start/End selection info (0-3) 
                                this.setStartEndSelected(startEndVal);
                                for (let i = this.head; i < newList.length; i++) {
                                  this.selectedCustomer[i - this.head] = newList[i][2];
                                }
                                this.calcWaitTime(); //Calculate wait time for the selected customer
                                this.isItYourTurn();
                              }
                            } else {
                              this.handleError(this.translate.instant('ERROR_1'));
                              this.observableRetrieve.unsubscribe();//Unsubscribe from the observable so the error prompt is not repeated every x seconds
                            }
                          }
                        });
                    });
                  }
                }
                else {
                  this.handleError(this.translate.instant('ERROR_1'));
                  this.observableRetrieve.unsubscribe();//Unsubscribe from the observable so the error prompt is not repeated every x seconds
                }
              }
            });
        })
      .catch(
        err => {
          this.favCustName = '';
          this.favIndex = -1;
          console.log(err);
        });
  }

  downloadMessage(msgText: string, msgTime: string) {
        if (msgText == null || msgText == '') {
          this.receivedMsg = '';
        } else {
          this.receivedMsg = msgText.replace(new RegExp("&#10;", "g"), "<br>"); //Need to use a "white-space: pre-wrap !important;" in the CSS class for the \n to be displayed as a new line. .replace(new RegExp("&#10;", "g"), "\n") -> replaces ALL occurences with \n;
          if (msgTime == null || msgTime == '') {
            this.dateLocal = '';
          } else {
            //let date = new Date();
            //let localHour = +msgTime.substr(11, 2) - date.getTimezoneOffset() / 60; //+ in front of message converts it to a number, getTimezoneOffset gives the GMT/UTC difference of the locale on the device
            let localHour = +msgTime.substr(11, 2) + +this.timeZone; //Use the time-zone read from internal storage

            let localHourStr: string;
            if (localHour < 10) {
              localHourStr = '0' + localHour; //Make sure localHour is displayed as 03:00 instead of 3:00
            } else {
              localHourStr = String(localHour);
            }

            if (localHour > 23) { //If localHour is >24, subtract 24 and add 1 to the day
              localHour = localHour - 24;
              if (localHour < 10) {
                localHourStr = '0' + localHour; //Make sure localHour is displayed as 03:00 instead of 3:00
              } else {
                localHourStr = String(localHour);
              }
              let tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              let tomorrowIso: string = tomorrow.toISOString() //Get tomorrow's date (calculated automatically for each month) in ISO format
              //Use tomorrow's days instead of msgTime
              this.dateLocal = '(' + tomorrowIso.substr(8, 2) + '-' + msgTime.substr(5, 2) + '-' + msgTime.substr(0, 4) + ', ' + localHourStr + ':' + msgTime.substr(14, 2) + ')';
            } else if (localHour < 0) { //If localHour is <0, subtract localHour from 24 and subrtact 1 from the day
              localHour = 24 - localHour;
              if (localHour < 10) {
                localHourStr = '0' + localHour; //Make sure localHour is displayed as 03:00 instead of 3:00
              } else {
                localHourStr = String(localHour);
              }
              let yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              let yesterdayIso: string = yesterday.toISOString() //Get tomorrow's date (calculated automatically for each month) in ISO format
              //Use yesterday's days instead of msgTime
              this.dateLocal = '(' + yesterdayIso.substr(8, 2) + '-' + msgTime.substr(5, 2) + '-' + msgTime.substr(0, 4) + ', ' + localHourStr + ':' + msgTime.substr(14, 2) + ')';
            } else {
              this.dateLocal = '(' + msgTime.substr(8, 2) + '-' + msgTime.substr(5, 2) + '-' + msgTime.substr(0, 4) + ', ' + localHourStr + ':' + msgTime.substr(14, 2) + ')';
            }

            this.received = true;
            if (this.previousMsgDate == '') { //If it is the very first time the room is viewed and there is already a message, do not notify
              this.previousMsgDate = msgTime;//Use msgTime instead of this.dateLocal because it contains ms resolution, so a second message sent in the same minute will be notified
            }
            if (msgTime != this.previousMsgDate) {
              this.messageNotify();
            }
            this.previousMsgDate = msgTime; //Store this message's date so a new message can be identified
          }

        }
  }

  getTimeZone() {
    this.storage.get('timeZone')
      .then((tz: number) => {
        this.timeZone = tz;
      })
      .catch(err => {
        console.log(err);
      })
  }

  getLanguage() {
    this.storage.get('lang') //Read the language setting so senteces on the template can be formatted correctly for each language
    .then((lang: string) => {
      if (lang == null) { //On the very first run there wont be any saved settings, so lang will be null. Start with the default language as "en"
        this.languages = "en";
      } else {
        this.languages = lang;
      }      
    })
    .catch(err => {console.log(err);});
  }

  messageNotify() {
    if (this.vibrateOn) {
      this.vibration.vibrate(1500); //Notify the user via vibration
      console.log('vibrate');
    };
    if (this.soundOn) {
      this.nativeAudio.play('msgAudio'); //Notify the user via audio 
      console.log('audio');
    }
  }

  private handleError(errorMessage: string) {
    const alert = this.alertCtrl.create({
      title: this.translate.instant('Error'),
      message: errorMessage,
      buttons: [this.translate.instant('OK')]
    });
    alert.present();
  }

}
