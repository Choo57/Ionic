import { Storage } from '@ionic/storage';
import { phpServices } from './../services/phpServices';
import { Component } from '@angular/core';
import { ViewController, NavParams, AlertController, Platform } from 'ionic-angular';
import { NgForm, FormControl } from '@angular/forms';
import { downloadService } from '../services/downloadService';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'page-join-queue',
  templateUrl: 'join-queue.html',
})
export class JoinQueuePage {
  name: string;
  passcode: string;
  //qNames: Array<any> = [];
  blankForm = new FormControl('');
  private direction: string;

  constructor(private viewCtrl: ViewController,
    private navParams: NavParams,
    public phpSrvc: phpServices,
    private alertCtrl: AlertController,
    private downloadSrv: downloadService,
    private storage: Storage,
    private platform: Platform,
    private translate: TranslateService) { }

  ionViewDidLoad() {
    this.name = this.navParams.get('name');
    this.passcode = this.navParams.get('passcode');
    this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted
  }

  onClose() {
    this.viewCtrl.dismiss(this.blankForm); //Blank form is passed when Cancel button is pressed
  }

  onSubmitQueue(form: NgForm) {
    //form.value.queueName = form.value.queueName.toLowerCase(); //Convert the room name to all lower case
    //form.value.queueName = form.value.queueName.replace(/\s*$/,""); //Use regex to remove any white spaces at the end of the string, if any
    // Connect to database and check if the user entered a valid queue and passcode        
    this.phpSrvc.phpValidateQueue(form.value.queueName, form.value.queuePasscode)
    .then(data => {  
      if (data == null || data == "invalidNP") {
        this.handleError(this.translate.instant('ERROR_21'));
      } else {
        form.value.queuePasscode = data[0]; //Pass the correct capitalization of passcode and queue name to the queues page, so it is displayed just like the queue manager typed
        form.value.queueName = data[1];
        // Download the room logo in baw64 format if there is one, if not, use the default one
        this.downloadSrv.downloadImg(form.value.queueName)        
          .then(imgData => {
            if (imgData != 'NoSuchFile') { //If a room logo exists, save the base64 image string on internal storage. 
              // Do this separately from the queues array as the base64 string is very long and it might affect the performance when the queues array is used
              // Save queue logo to local storage as { q+QueueName : base64Image }
              let qName = 'q' + form.value.queueName;
              this.storage.set(qName, imgData) //Set overrides the data in the storage
                .then(result => {
                    //console.log('Image saved to device: ' + result);
                    this.viewCtrl.dismiss(form);
                  }
                )
                .catch(err => {
                    console.log(err); //If there are no entries as q+QueueName on internal storage, display the default image
                    this.handleError(this.translate.instant('ERROR_16'));
                    this.viewCtrl.dismiss(form);
                  }
                );
            } else { // If data == 'NoSuchFile', leave the default image
              this.viewCtrl.dismiss(form);
            }           
          })
          .catch( error => {
            console.log(error); //If there are no entries as q+QueueName on internal storage, display the default image
            this.handleError(this.translate.instant('ERROR_22'));
            this.viewCtrl.dismiss(form);
          })

        //this.qNames = data;
        
      }
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
