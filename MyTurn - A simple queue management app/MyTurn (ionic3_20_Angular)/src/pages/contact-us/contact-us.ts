import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { NavController, NavParams, AlertController, ViewController, Platform } from 'ionic-angular';
import { phpServices } from '../services/phpServices';
import { NgForm, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'page-contact-us',
  templateUrl: 'contact-us.html',
})
export class ContactUsPage implements OnInit {

  private rowNo: number = 7; //Default number of rows of textarea
  public msg: string = '';
  contactUsForm: FormGroup;
  userData = { "name": "","email": "", "msg": "" };
  private direction: string;
  
  constructor(public navCtrl: NavController, 
              public navParams: NavParams,
              private alertCtrl: AlertController,
              private viewCtrl: ViewController,
              private translate: TranslateService,
              public phpSrvc: phpServices,
              public platform: Platform) {
  }

  ngOnInit(){
    let EMAILPATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    this.contactUsForm = new FormGroup({      
      name: new FormControl('', [Validators.required, Validators.pattern('[^<>"\']*'), Validators.minLength(1), Validators.maxLength(30)]),
      email: new FormControl('', [Validators.required, Validators.pattern(EMAILPATTERN)]),
      msg: new FormControl('', [Validators.required, Validators.pattern('[^<>"\']*'), Validators.minLength(1), Validators.maxLength(300)])
    });

  }

  ionViewDidLoad(){
    this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted
  }

  onClose() {
    this.viewCtrl.dismiss(); //Close the form
  }

  onSubmitForm(form: NgForm) {
    console.log(this.userData);
    this.phpSrvc.phpContactUs(this.userData.name, this.userData.email, this.userData.msg)
    .then(data => {
      console.log('data:');
      console.log(data);
      if (data == 'msgDelivered'){
        this.handleError(this.translate.instant('Thanks!'), this.translate.instant('CONTACTUS_THANKS'));
        this.viewCtrl.dismiss(); //Close the form
      }
      else {
        console.log(data);
        this.handleError(this.translate.instant('Error'), this.translate.instant('ERROR_10'));
      }      
    })
    .catch(err => {
      console.log(err);
      this.handleError(this.translate.instant('Error'),this.translate.instant('ERROR_10'));      
    });
  }

  private handleError(title: string, errorMessage: string) {
    const alert = this.alertCtrl.create({
      title: title,
      message: errorMessage,
      buttons: [this.translate.instant('OK')]
    });
    alert.present();
  }


}
