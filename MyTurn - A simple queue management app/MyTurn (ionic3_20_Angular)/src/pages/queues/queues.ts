import { downloadService } from './../services/downloadService';
import { JoinQueuePage } from './../join-queue/join-queue';
import { NgForm } from '@angular/forms';
import { UserQueue } from './../../models/userQueue';
import { NavController, ModalController, AlertController, Platform } from 'ionic-angular';
import { Component, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { EachQueuePage } from '../eachQueue/eachQueue';
import { Storage } from '@ionic/storage';
import { phpServices } from '../services/phpServices';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import { Subscription } from 'rxjs/Subscription';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'page-queues',
  templateUrl: 'queues.html'
})

export class QueuesPage {
  @ViewChild('queueTip', {read: ElementRef}) queueTipElement:ElementRef;
  defaultImage = 'assets/imgs/defaultRoomImg40.png';
  private autoRetrieveInterval: number = 15000 //Set the loop duration the DB will be queried for any changes 
  observableRetrieve: Subscription; //import Subscription & use so setInterval only works on this page and does not keep working under others
  queues: UserQueue[] = [];
  qImages: Array<string> = [];
  totalCustomers: number;
  formQname: string;
  formQPasscode: string;
  qn: Array<string> = [];
  pc: Array<string> = [];
  exists: number = -1;
  hasInternet: boolean = true; 
  downloadedImages: boolean = true; //Flag to make sure rom images are downloaded only ONCE upon ionViewWillEnter
  private showTip: boolean; //Flag to show or hide the div that contains the tip
  firstIteration: boolean = true; //Flag to prevent the flickering of the tip on every observableRetrieve
  private direction: string; //Text direction read from platform

  constructor(private navCtrl: NavController,
    private modalCtrl: ModalController,
    private storage: Storage,
    public phpSrvc: phpServices,
    private alertCtrl: AlertController,
    public downloadSrv: downloadService,
    public translate: TranslateService,
    private renderer2: Renderer2,
    private platform: Platform) {
    }

  ionViewWillEnter() { //This will get the view refreshed when re-enters  
    this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted

    this.storage.get('queuesTips')
      .then((tips: boolean) => {
        if (tips == null) { //On the very first run there wont be any saved settings, so tips will be null. Start with the setting enabled (true)
          this.setTips(true); //Save the setting to internal memory if there were no entries for it
          this.showTip = true;
        } else { this.showTip = tips; }
      })
      .catch(err => {console.log(err);});  

    this.downloadedImages = true; //Remove this flag from here to make queue image downloads only ONCE for each app startup. Application will need to be restarted to get the images refreshed. If set to TRUE here, imgs will be donwloaded on every ionViewWillEnter
    this.fetchQueues();    
    this.observableRetrieve = Observable.interval(this.autoRetrieveInterval).subscribe(() => {   
      this.firstIteration = false;   
      this.fetchQueues();
    });
  } //**** END OF ionViewWillEnter

  ionViewWillLeave() { //Unsubscribe from the observable and interval
    if (this.observableRetrieve != undefined) {
      this.observableRetrieve.unsubscribe();
    }
  } //**** END OF ionViewWillLeave

  ionViewDidLeave(){
    //Remove the visible classes so the animation is not kicked in twice, causing a flickering
    if (this.queueTipElement != undefined) {
      this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class on view leave, if it exists
      this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
    }
  }

  setTips(value: boolean){    
    this.storage.set('queuesTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
  }

  displayTip() {
    setTimeout(() => {
      if (this.showTip) {
        this.renderer2.addClass(this.queueTipElement.nativeElement, 'TipIn'); //adds the .managerTip class to the html element
        this.renderer2.listen(this.queueTipElement.nativeElement, "animationend", (event) => {
          this.renderer2.removeClass(this.queueTipElement.nativeElement, 'TipIn'); //Make the tip visible
          this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
          this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipVisible'); //Make the tip visible
        });
      }
    }, 250);
  }

  endTip() {
    this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class
    this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Hide the tip
  }

  dontShow(){
    this.endTip(); //Close currently visible tips, then save the setting
    this.setTips(false); //Set the tips value to FALSE
  }

  onLoadQueue(q: UserQueue[], i: number) {
    this.navCtrl.push(EachQueuePage, { q: q, i: i });
  }

  onAddQueue() {
    this.showTip = false; //Hide the tip div
    this.setTips(false); //Set the tips value to FALSE
    const modal = this.modalCtrl.create(JoinQueuePage);
    modal.present();
    modal.onDidDismiss((form: NgForm) => {    // Receive the form from the Modal through onDidDismiss
      this.formQname = form.value.queueName;
      this.formQPasscode = form.value.queuePasscode;

      if (form.submitted) { //The form element passed will be null if "Cancel" button was pressed. Add the values if submit was clicked
        //Get the number of customers in the room to be displayed on the main Queues page 
        this.phpSrvc.phpGetRoomCount(this.formQname).then(data => {
          this.totalCustomers = (data == null ? 0 : data);
          this.saveQandImg(this.formQname, this.formQPasscode, this.totalCustomers); //Get the queue image BEFORE pushing the new queue to the queues array
        });
      } else {
        //console.log("Blank form was passed/Cancel button pressed");
      }
    })
  }

  fetchQueues() {
    this.storage.get('queues')
    .then((queueList: UserQueue[]) => {
        if (queueList == null || queueList.length == 0) { //If no queues on storage, display the tip that ponts to the + button
          if (this.firstIteration) { //Do not re-play the animation on every iteration, this.firstIteration will be set to false after the very first run
            if (this.showTip){ //If the showTip flag copied from internal storage is TRUE, display the tip. If at one point it was set to FALSE, do not show the tip
              this.displayTip(); //Display the tip that points to the + button
            }            
          }          
        } else { 
          this.showTip = false; //Hide the tip div
          this.setTips(false); //Set the tips value to FALSE
          this.queues = queueList != null ? queueList : []; //If there are no places stored, make this.queues an empty array
          this.fetchImages(); //Get the queue images pulled as quickly as possible to prevent flickering

          let qNamesOnly: Array<string> = []; // Create a separate array that will hold only the names of the queues held in storage
          for (let i = 0; i < this.queues.length; i++) {
            qNamesOnly[i] = this.queues[i].name;
          };
          
          //Data returned by phpUpdateQueueList is like below
          //
          // name          passcode       COUNT(b.name)
          // Browser 2     Passcode       11
          // Cagan Room    Cagan          8
          this.phpSrvc.phpUpdateQueueList(qNamesOnly)  
            .then(data => {
              if (data.error != undefined || data == "qListError") { //If an error is received during php connection, data will include an error object. If all fine, there won't be any error objects so it will be undefined
                if (this.hasInternet) { //Only show the error once until connection is restored
                  this.handleError(this.translate.instant('Error'),this.translate.instant('ERROR_1'));
                }
                this.hasInternet = false; //No internet connection, do not clear the queues array from internal storage!                
              } else { 
                this.hasInternet = true;

                //First check room name, if a match was found on the DB. For every match found, update the customer count
                //If no matches, prompt room got deleted or changed and delete room after OK
                //Then check if passcode matches. If not, prompt user to enter the updated passcode. Stay on this prompt unless correct passcode is entered
                //Finally, write the up-to-date queues array to phone storage

                //------> Then think about how to handle the room images, how to validate any changes and how to save them to storage

                if (data.length == 0) {
                  this.queues = []; //If data received does not have any queues (i.e. no matching rooms), clear the queues array
                  this.storage.remove('queues') //Remove any queue images that might have been storage as well
                        .then(_ => { })
                        .catch(err => { console.log('Queues deleted from internal storage') });
                } else {
                  for (let i=0; i<this.queues.length; i++){
                    this.exists = -1;   //Reset the flag
                    for (let j=0; j<data.length; j++) { //Compare list received with the saved queue list
                      if (data[j][0].toUpperCase() == this.queues[i].name.toUpperCase()) { //Convert both strings to all capitals for easy comparison (so == does not return incorrect due to capitalization)
                        this.exists = 1;                //If the queue name exists on DB
                        this.queues[i].totalCusts = data[j][2]; //Update the room count                        
                        if (this.queues[i].passcode != data[j][1]){ //Check if room passcode changed
                          this.handleError(this.translate.instant('Please note:'), this.translate.instant('Room_Passcode_Changed', {roomName: this.titleCase(this.queues[i].name)}));
                          //Delete queue from this.queues, update internal storage                          
                          this.storage.set('queues', this.queues) //Set overrides the data in the storage with the new queues array
                            .then(_ => { })
                            .catch(err => { console.log('Queue deleted from display but could not delete from local storage') });
                          this.storage.remove('q' + this.queues[i].name) //Remove any queue images that might have been storage as well
                            .then(_ => { })
                            .catch(err => { console.log('Queue deleted from display but could not find/delete any queue images') });
                            this.queues.splice((i), 1); //Delete the queue that does not exist from the queues array AFTER removing from internal storage as this.queues[i] will then become undefined
                            i -= 1; //Put the counter -1 behind, after splice array length got -1, so start the iteration from one position before
                        }
                      }
                    }                                       
                    if (this.exists == -1) { //Queue NOT found on DB! Prompt the user and then delete from storage
                      this.handleError(this.translate.instant('Please note:'),this.translate.instant('Room_Name_Changed', {roomName: this.titleCase(this.queues[i].name)}));   
                      this.storage.remove('q' + this.queues[i].name) //Remove any queue images that might have been storage as well
                        .then(_ => { })
                        .catch(err => { console.log('Queue deleted from display but could not find/delete any queue images') });
                      this.queues.splice((i), 1); //Delete the queue that does not exist from the queues array AFTER removing from internal storage as this.queues[i] will then become undefined
                      i -= 1; //Put the counter -1 behind, after splice array length got -1, so start the iteration from one position before
                    }
                  }
                  //Save the final state of the queues array to internal storage
                  this.storage.set('queues', this.queues) //Set overrides the data in the storage with the new queues array
                  .then(_ => { })
                  .catch(err => { console.log('Queue deleted from display but could not delete from local storage') });

                  //this.fetchImages(); //Get the queue images refreshed
                  if (this.downloadedImages){
                    this.checkRoomImgs(qNamesOnly); //Connect to WWW, download all room images and update internal storage with the new images
                    this.downloadedImages = false;
                  }                  
                  this.hasInternet = true;
                }

              }
            }) //END OF: this.phpSrvc.phpUpdateQueueList(qNamesOnly).then
            .catch(err => {
              this.hasInternet = false; //No internet connection, do not clear the queues array from internal storage!
              this.handleError(this.translate.instant('Error'),this.translate.instant('ERROR_1'));
              console.log(err);
            }); //END OF: this.phpSrvc.phpUpdateQueueList(qNamesOnly).catch

          // Get room images here (INSIDE THE .then block that guarantees the queues array is retrieved)
          //this.fetchImages();
        } // END OF: if (queueList != null) {
      }) // END OF: this.storage.get('queues').then
      .catch(err => { console.log(err); });
  }


  fetchImages() {
    // Make sure the images are fetched for each room in the same order they exist in the "queues" array
    // "queues" array looks something like this: 0: {name: "My Room", passcode: "1", totalCusts: 4}
    for (let i = 0; i < this.queues.length; i++) {
      this.storage.get('q' + this.queues[i].name) // Add the letter 'q' to the queue name, loop through each queue.name on internal storage
        .then((base64Img: string) => {
          if (base64Img == null) { //If there are no keys as q+QueueName on interna storage, base64Img will be = null
            this.qImages[i] = this.defaultImage; //So assign the default room image
          } else {
            this.qImages[i] = base64Img;
          }
        })
        .catch(err => {//this.qImages[i] = this.defaultImage;
        });
    }
  }

  saveQandImg(newQName, passcode, total) { //A separate function to retrieve the queue image BEFORE the queue is pushed into the queues array. This will guarantee the room image is displayed without any flickering
    this.storage.get('q' + newQName) // Add the letter 'q' to the queue name
      .then((base64Img: string) => {
        if (base64Img == null) { //If there are no keys as q+QueueName on internal storage, base64Img will be = null
          this.qImages[this.queues.length] = this.defaultImage; //So assign the default room image to the last element of the qImages array
        } else {
          this.qImages[this.queues.length] = base64Img;
        }
        const newQueue = new UserQueue(newQName, passcode, total);
        this.queues.push(newQueue);   // Push queueName and queuePasscode to the queues array
        this.storage.set('queues', this.queues) //Set overrides the data in the storage
          .then(data => {//this.fetchQueues(); //Only load the queue image into the qImage array if the queues array was successfully updated on internal storage
          })
          .catch(err => {
            this.queues.splice(this.queues.indexOf(newQueue), 1);  //In case of an error with saving the new queue, remove it and show a warning
            console.log('Error could not save new queue to device')
          });
      })
      .catch(err => {
        this.qImages[this.queues.length] = this.defaultImage;
      });
  }

  // If it is the very first run after a fresh installation, check if there are any existing images on the server for these rooms
  // Download the room logo in baw64 format if there is one, if not, use the default one
  private checkRoomImgs(roomNames) {
    //https://medium.com/@pyrolistical/how-to-get-out-of-promise-hell-8c20e0ab0513
    //Push all promises into an array, then use Promise.all to start them at the same time
    //Promise.all will only return the result once all of them are completed
    let promises = [];
    for (let i = 0; i < roomNames.length; i++) {
      promises.push(this.downloadSrv.downloadImg(roomNames[i])) //promiseData[i] is the room name retrieved from DB that matched this devices UUID
    }

    Promise.all(promises)
      .then((imgsArray) => {
        let storagePromises = [];
        for (let i = 0; i < imgsArray.length; i++) {
          if (imgsArray[i] != 'NoSuchFile') {
            storagePromises.push(this.storage.set('q'+roomNames[i], imgsArray[i])) //promiseData[i][0] is the room names passed to the function
          }
        }
        Promise.all(storagePromises) //Once all imgs are downloaded and all are written to interal storage, start loading them to qImages array
          .then(_ => {
            this.fetchImages(); //Pass the same data to loadAdminRooms
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((e) => {
        console.log(e);
      });
  }

  private titleCase(str) {
    return str.toLowerCase().split(' ').map(function(word) {
      return word.replace(word[0], word[0].toUpperCase());
    }).join(' ');
  }

  private handleError(title:string, errorMessage: string) {
    const alert = this.alertCtrl.create({
      title: title,
      message: errorMessage,
      buttons: [this.translate.instant('OK')]
    });
    alert.present();
  }
}