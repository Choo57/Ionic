import { FaqPage } from './../faq/faq';
import { Component, OnInit } from '@angular/core';
import { NavController, Platform, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage implements OnInit {
  displayApp: boolean = false; //Display th app only after the selected language is loaded and the translation is done
  languages;
  timeZone;
  currentIndex: number = 0;
  //0: English, 1: Turkish, 2: Greek, if you slide one more time to right, index becomes 3
  // so set 3: to the last language (i.e. Greek) as well
  vibrateOn: boolean; //Leave these UNDEFINED initialls and use *ngIf="vibrateOn != null" on the HTML. Otherwise the toggle button will move AFTER the page has loaded (e.g. from false to true)
  soundOn: boolean; //Leave these UNDEFINED initialls and use *ngIf="vibrateOn != null" on the HTML. Otherwise the toggle button will move AFTER the page has loaded (e.g. from false to true)
  private tipsEnabled: boolean = false;
  private tipsDisabled: boolean = false;
  public disableColor: string = "#34495e"; //darkGrey color
  public enableColor: string = "#6a89cc"; //Primary dark purple

  constructor(public navCtrl: NavController,
    private storage: Storage,
    public translate: TranslateService,
    public platform: Platform,
    public alertCtrl: AlertController) {
  }
  
  ngOnInit() {
    //Get language setting and apply the translation
    this.storage.get('lang')
    .then((lang: string) => {
      if (lang == null) { //On the very first run there wont be any saved settings, so lang will be null. Start with the default language as "en"
        this.languages = "en";
      } else {
        this.languages = lang;
      }
      this.selectedLang(lang); //Apply the translation
      this.displayApp = true; //LANGUAGE LOADED, ENABLE THE HTML DISPLAY
    })
    .catch(err => {
      this.handleError(this.translate.instant('ERROR_11'));
      this.displayApp = true; //DISPLAY THE APP ANYWAYS, BUT SHOW AN ERROR THAT THE LANGUAGE MIGHT NOT BE LOADED PROPERLY
      console.log(err);});

    this.storage.get('timeZone')
      .then((tz: number) => {
        if (tz == null) { //On the very first run there wont be any saved settings, so tz will be null. Start with the timezone obtained by getTimezoneOffset
          let date = new Date();
          this.timeZone = -date.getTimezoneOffset() / 60; //getTimezoneOffset gives the GMT/UTC difference of the locale on the device, suggest this timezone as the default setting
          this.setTimeZone(this.timeZone); //Save the setting to internal memory if there were no entries for it
        } else {
          this.timeZone = tz;
        }
      })
      .catch(err => {console.log(err);})

    this.storage.get('vibrateOn')
      .then((vibSet: boolean) => {
        if (vibSet == null) { //On the very first run there wont be any saved settings, so vibSet will be null. Start with the setting enabled (true)
          this.setVibrate(); //Save the setting to internal memory if there were no entries for it
          this.vibrateOn = true;
        } else {
          this.vibrateOn = vibSet;
        }
      })
      .catch(err => {console.log(err);});

    this.storage.get('soundOn')
      .then((soundSet: boolean) => {
        if (soundSet == null) { //On the very first run there wont be any saved settings, sot vibSet will be null. Start with the setting enabled (true)
          this.setSound(); //Save the setting to internal memory if there were no entries for it
          this.soundOn = true;
        } else {
          this.soundOn = soundSet;
        }
      })
      .catch(err => {console.log(err);});      
  } //END OF ngOnInit

  setVibrate() {
    this.vibrateOn = (this.vibrateOn == null ? true : !this.vibrateOn); //Toggle the vibrate setting and write it to memory. If null, set it to true and save to local storage
    this.storage.set('vibrateOn', this.vibrateOn) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the vibration setting')});
  }

  setSound() {
    this.soundOn = (this.soundOn == null ? true : !this.soundOn); //Toggle the sound setting and write it to memory. If null, set it to true and save to local storage
    this.storage.set('soundOn', this.soundOn) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the sound setting')});
  }
   

  setTimeZone(tzone: number) {
    this.timeZone = tzone;
    this.storage.set('timeZone', this.timeZone) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the sound setting')});
  }

  checkFAQ() {
    this.navCtrl.push(FaqPage);
  }

  selectedLang(lang) {
    if (lang == 'en') {
      this.translate.use('en');
     /* this.translate.get('Welcome').subscribe(value => {
        // value is our translated string
        console.log(value);
      }); */
    } else if (lang == 'tr') {
      this.translate.use('tr');
      this.translate.setDefaultLang('tr');      
    } else if (lang == 'ar') {
      this.translate.use('ar');
      this.translate.setDefaultLang('ar'); 
    } else if (lang == 'gr') {
      this.translate.use('gr');
      this.translate.setDefaultLang('gr'); 
    }

    //this is to determine the text direction depending on the selected language
    if (lang == 'ar') {
      this.platform.setDir('rtl', true);
      //this.platform.setDir('ltr', false);   DO NOT SET THIS AS WELL, IT WILL PREVENT RE-ORDERING LISTS, (ionItemReorder) gesture will NOT get triggered
    }
    else {
      this.platform.setDir('ltr', true);
      //this.platform.setDir('rtl', false); DO NOT SET THIS AS WELL, IT WILL PREVENT RE-ORDERING LISTS, (ionItemReorder) gesture will NOT get triggered
    }

    //Save language to phone internal storage
    this.storage.set('lang', lang) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the language preference')});
  }

  setTips(mode: boolean){
    if (mode){ //Enable tips      
      this.enableColor = "#27ae60"; //Secondary green
      this.writeTipstoDB(true); //Set all tips values to TRUE
      setTimeout(() => { //Turn the button to green to show the setting is applied
        this.enableColor = "#6a89cc"; //Primary purple
      }, 1200);

    } else { //Disable tips
      this.disableColor = "#27ae60"; //Secondary green
      this.writeTipstoDB(false); //Set all tips values to TRUE
      setTimeout(() => { //Turn the button to green to show the setting is applied
        this.disableColor = "#34495e"; //darkGrey color
      }, 1200);

    }
  }
  
  writeTipstoDB(value: boolean){    
    this.storage.set('homeTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
    this.storage.set('queuesTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
    this.storage.set('adminTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
    this.storage.set('eachRoomTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
  }

  private handleError(errorMessage: string) {
    const alert = this.alertCtrl.create({
      title: this.translate.instant('Error'),
      message: errorMessage,
      buttons: ['OK']
    });
    alert.present();
  }

  
}
