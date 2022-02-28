import { TranslateService } from '@ngx-translate/core';
import { phpServices } from './../services/phpServices';
import { Device } from '@ionic-native/device';
import { AdminRooms } from './../../models/adminRooms';
import { EachRoomPage } from './../each-room/each-room';
import { NgForm } from '@angular/forms';
import { AddRoomPage } from './../add-room/add-room';
import { ModalController, NavController, AlertController, LoadingController, Platform } from 'ionic-angular';
import { Component, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { Storage } from '@ionic/storage';
import { downloadService } from '../services/downloadService';

@Component({
  selector: 'page-admin',
  templateUrl: 'admin.html'
})

export class AdminPage {
  @ViewChild('queueTip', {read: ElementRef}) queueTipElement:ElementRef;
  defaultImgURL = 'assets/imgs/defaultRoomImg40.png';
  public adminRooms: AdminRooms[] = []; //Make sure this is initialized as an EMPTY array first (i.e. do not leave out the =[] part)
  private deviceUUID: string;
  private firstTimeUse: boolean = true; //This flag will be TRUE everytime the app is started. So user will need to download the same room images everyime the app is started which consumes internet bandwidth
                                        //To prevent this, store it to storage so the images are ONLY downloaded IF the app is installed freshly OR if the app cache/data is deleted
  private hasInternet: boolean = true; 
  private viewReady: boolean = false;
  private showTip: boolean = false; //Flag to show or hide the div that contains the tip
  private direction: string; //Text direction read from platform
  
  constructor(private modalCtrl: ModalController,
    private navCtrl: NavController,
    private device: Device,
    public phpSrvc: phpServices,
    public downloadSrv: downloadService,
    private alertCtrl: AlertController,
    private storage: Storage,
    private translate: TranslateService,
    private renderer2: Renderer2,
    public loadingCtrl: LoadingController,
    private platform: Platform) {    
  }

  //Get device UUID and load admin queues of the user
  ionViewWillEnter() {  //On ionViewDidLoad custNumbers don't update, on ionViewWillEnter room images flicker
    this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted

    if (!this.device.uuid) {      //Get unique Device UUID (will be null when tested with 'ionic serve')
      this.deviceUUID = 'IonicServeUUID';
    } else {
      this.deviceUUID = this.device.uuid;
    }

    //this.firstTimeUse flag will be TRUE everytime the app is started. So user will need to download the same room images everyime the app is started which consumes internet bandwidth
    //To prevent this, store it to storage so the images are ONLY downloaded IF the app is installed freshly OR if the app cache/data is deleted
    if (this.firstTimeUse) { //Check if the app is launched the very first time, or if app data/cache was cleared
      this.storage.get('firstTimeUse') //If this.firstTimeUse was set to false before, no need to check internal storage again
        .then(result => {
          if (result != null) {
            this.firstTimeUse = result; //If there are no keys as firstTimeUse, it's value will not be affected here
          }
        })
        .catch((err) => {
          console.log(err);
        })
    }  

    //Show LOADING for 2 seconds
    const loading = this.loadingCtrl.create({
      content: "Connecting..",
      //duration: 2000, //Show loading for 2 seconds (or until it is dismissed)
      //dismissOnPageChange: true //Causes an error "removeView was not found" and crashes the app as the loading gets dismissed twice
    });
    loading.present();

    this.phpSrvc.phpGetAdminRooms(this.deviceUUID)
      .then(data => {
        setTimeout(() => {
          loading.dismiss(); //Dismiss the loader 500ms after the data is retrieved (so for fast connecctions it does not cause a flickering)
        }, 500);
        
        if (data == null) { //No rooms on DB whose UUID match that of this device
          this.adminRooms = []; //Clear the array so when "back button/navCtrl.pop" is called, it will be freshly populated
          //this.showTip = true;

          this.storage.get('adminTips') //Get the tips setting from storage and show/hide the tips accordingly
          .then((tips: boolean) => {
            if (tips == null) { //On the very first run there wont be any saved settings, so tips will be null. Start with the setting enabled (true)
            this.setTips(true); //Save the setting to internal memory if there were no entries for it
            this.showTip = true;
            this.displayTip();
            } else { 
              this.showTip = tips; 
              this.displayTip();
            } 
          })
          .catch(err => {console.log(err);});  
          
        } else if (data.error == undefined) { //If there are no error messages that are returned by the DB, retrieve the room list
          this.hasInternet = true;
          this.showTip = false; //Hide the tip div
          if (this.firstTimeUse) { //Check if the app is launched for the first time. If yes, check WWW if there are any imgs stored for these admin rooms
            this.firstTimeUse = false; 
            this.saveFirstTimeParam();
            this.checkRoomImgs(data); //data passed to checkRoomImgs is the output of phpGetAdminRooms     
          } else {
            this.loadAdminRooms(data); //Load the admin rooms without checking WWW for any image files that match the name of the room
          }
        } else {
          this.handleError(this.translate.instant('ERROR_1'));
          this.hasInternet = false;
          this.viewReady = false;
        }
      });

  }

  ionViewDidLeave(){
    //Remove the visible classes so the animation is not kicked in twice, causing a flickering
    if (this.queueTipElement != undefined) {
      this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class on view leave, if it exists
      this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
    }
  }

  setTips(value: boolean){    
    this.storage.set('adminTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
  }

  dontShow(){
    this.endTip(); //Close currently visible tips, then save the setting
    this.setTips(false); //Set the tips value to FALSE
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
    this.showTip = false; //Hide the tip div
  }

  onAddRoom() {
    this.showTip = false; //Hide the tip div
    const modal = this.modalCtrl.create(AddRoomPage, {mode: 'Create'});
    modal.present();
    // Format of data received from the form: {roomName: "Test Room", roomPasscode: "passcode", imageURL: "assets/imgs/img40blue.png"}
    modal.onDidDismiss((form: NgForm) => {    // Receive the form from the Modal through onDidDismiss      
      if (form.submitted) { //The form element passed will be null if "Cancel" button was pressed. Add the values if submit was clicked
        const newRoom = new AdminRooms(form.value.roomName, null, 0, form.value.imageURL); //Userlist is not received yet, so pass 'null'
        this.adminRooms.push(newRoom);
        this.hasInternet = true;
        this.viewReady = true;

        // SAVE the local image URL to device so it can be displayed on the Admin/My Rooms page next to each respective room
        // Format of data received from the form: {roomName: "Test Room", roomPasscode: "passcode", imageURL: "assets/imgs/img40blue.png"}
        if (form.value.imageURL != this.defaultImgURL) {
          this.storage.set(form.value.roomName, form.value.imageURL) //Set overrides the data in the storage, save {roomName : logoURL} for each room
            .then(data => {})
            .catch(err => {
                this.adminRooms.splice(this.adminRooms.indexOf(newRoom), 1);  //In case of an error with saving the new queue, remove it and show a warning
                console.log('Error could not the logo photo to device');
                this.handleError(this.translate.instant('ERROR_16') + err);
            });
        }
      }
    })
  }

  onLoadRoom(room: AdminRooms, i: number) {
    this.navCtrl.push(EachRoomPage, { room: room }); //Pass the Room Name
  }

  // If it is the very first run after a fresh installation, check if there are any existing images on the server for these rooms
  // Download the room logo in baw64 format if there is one, if not, use the default one
  private checkRoomImgs(promiseData) {
    //https://medium.com/@pyrolistical/how-to-get-out-of-promise-hell-8c20e0ab0513
    //Push all promises into an array, then use Promise.all to start them at the same time
    //Promise.all will only return the result once all of them are completed
    let promises = [];
    for (let i = 0; i < promiseData.length; i++) {
      promises.push(this.downloadSrv.downloadImg(promiseData[i][0])) //promiseData[i][0] is the room name retrieved from DB that matched this devices UUID
    }

    Promise.all(promises)
      .then((imgsArray) => {
        let storagePromises = [];
        for (let i = 0; i < imgsArray.length; i++) {
          if (imgsArray[i] != 'NoSuchFile') {
            storagePromises.push(this.storage.set(promiseData[i][0], imgsArray[i])) //promiseData[i][0] is the room name retrieved from DB that matched this devices UUID
          }
        }
        Promise.all(storagePromises) //Once all imgs are downloaded and all are written to interal storage, start loading the adminRooms array
          .then(_ => {
            this.loadAdminRooms(promiseData); //Pass the same data to loadAdminRooms
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((e) => {
        console.log(e);
      });

    //https://medium.com/@pyrolistical/how-to-get-out-of-promise-hell-8c20e0ab0513
    /*     this.downloadSrv.downloadImg(this.adminRooms[0].name)
           .then(data => {
             console.log(0);
             console.log(data);
             return this.downloadSrv.downloadImg(this.adminRooms[1].name)
           })
           .then(data => {
             console.log(1);
             console.log(data);
             return this.downloadSrv.downloadImg(this.adminRooms[2].name)
           })
           .then(data => {
             console.log(2);
             console.log(data);
           });  */
  }

  private loadAdminRooms(data) { //data received is the output of phpGetAdminRooms     
    for (let i = 0; i < data.length; i++) { //Load the list of Admin Rooms created on this device.             
      // Get the room image from internal storage
      this.storage.get(data[i][0]) //data[i][0] is the room name retrieved from DB that matched this devices UUID
        .then((logoURL: string) => {
            if (logoURL == null) {
              if (this.adminRooms[i] == undefined || this.adminRooms[i][0] != data[i][0]) {
                this.adminRooms[i] = new AdminRooms(data[i][0], null, data[i][1], this.defaultImgURL);
              }
            } else if (this.adminRooms[i] == undefined || this.adminRooms[i][0] != data[i][0] || logoURL != this.adminRooms[i].imgURL) { //Only update the array if the value is different
              this.adminRooms[i] = new AdminRooms(data[i][0], null, data[i][1], logoURL);
            }
            if (i == data.length-1){
              this.viewReady = true; //Set the viewReady flag to true as soon as the last image is loaded
            }
          })
        .catch(err => {
            //console.log(err);
            //loading.dismiss();
          });
    }
    if (this.adminRooms.length > data.length) { //If an admin room is deleted, this.adminRooms.length will be > data.length
      for (let i = 0; i < (this.adminRooms.length - data.length); i++) { //First elements will match those retrieved by data
        this.adminRooms.splice(this.adminRooms.length - i - 1, 1);           //So delete the extra elements at the end of the array
      }
    }
  }

  private saveFirstTimeParam() {
    this.storage.set("firstTimeUse", false) //Save firstTimeUse parameter to storage
        .then( _ => { })
        .catch( err => {
          console.log(err);
        });
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
