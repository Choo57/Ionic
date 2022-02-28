import { SettingsPage } from './../settings/settings';
import { ContactUsPage } from './../contact-us/contact-us';
import { Component, OnInit, Renderer2, ElementRef, ViewChild } from '@angular/core';
import { NavController, Platform, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit {
  @ViewChild('managerTip', {read: ElementRef}) managerTipElement:ElementRef;
  @ViewChild('queueTip', {read: ElementRef}) queueTipElement:ElementRef;
  displayApp: boolean = false; //Display th app only after the selected language is loaded and the translation is done
  languages;
  timeZone;
  currentIndex: number = 0;
  //0: English, 1: Turkish, 2: Greek, if you slide one more time to right, index becomes 3
  // so set 3: to the last language (i.e. Greek) as well
  vibrateOn: boolean; //Leave these UNDEFINED initialls and use *ngIf="vibrateOn != null" on the HTML. Otherwise the toggle button will move AFTER the page has loaded (e.g. from false to true)
  soundOn: boolean; //Leave these UNDEFINED initialls and use *ngIf="vibrateOn != null" on the HTML. Otherwise the toggle button will move AFTER the page has loaded (e.g. from false to true)
  private showTip: boolean; //Flag to show or hide the div that contains the tip
  private showTip2: boolean = false; //Flag to show or hide the div that contains the tip
  private direction: string; //Text direction read from platform

  constructor(public navCtrl: NavController,
    private storage: Storage,
    public translate: TranslateService,
    public platform: Platform,
    public alertCtrl: AlertController,
    private renderer2: Renderer2) {
  }

  ionViewWillEnter(){    

    this.storage.get('homeTips')
      .then((tips: boolean) => {
        this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted
                                          // ALSO SET THIS ON ngOnInit!!

        if (tips == null) { //On the very first run there wont be any saved settings, so tips will be null. Start with the setting enabled (true)
          this.setTips(true); //Save the setting to internal memory if there were no entries for it          
          this.showTip = true;
        } else {
          this.showTip = tips;
        }
      })
      .catch(err => {console.log(err);});  

    setTimeout(() => {
      if (this.showTip) { //this.showTip gets its value from internal storage. The promise "should" get completed within this setTimeout period, so doing the if statement inside the setTimeOut
        this.renderer2.addClass(this.managerTipElement.nativeElement, 'TipIn'); //adds the .managerTip class to the html element
        this.renderer2.listen(this.managerTipElement.nativeElement, "animationend", (event) => {
          this.renderer2.removeClass(this.managerTipElement.nativeElement, 'TipIn'); //Make the tip visible
          this.renderer2.removeClass(this.managerTipElement.nativeElement, 'tipInitial'); //Make the tip visible
          this.renderer2.addClass(this.managerTipElement.nativeElement, 'tipVisible'); //Make the tip visible
        });
      }
    }, 1200);
  }

  nextTip() {  
    this.showTip = false;  
    this.showTip2 = true;

    setTimeout(() => {    
    this.renderer2.removeClass(this.managerTipElement.nativeElement, 'tipVisible'); //Remove the visible class
    this.renderer2.addClass(this.managerTipElement.nativeElement, 'tipInitial'); //Hide the tip
    this.showTip = false; //Do not set ths to FALSE before the above 2 lines. It will hide the DIV and the managerTipElement will be undefined
                          //Tip div will stay there so the cards don't move, but the buttons will be disabled and the div opacity will be 0 (invisible)
    this.renderer2.addClass(this.queueTipElement.nativeElement, 'TipIn'); //adds the .managerTip class to the html element
      this.renderer2.listen(this.queueTipElement.nativeElement, "animationend", (event) => {
        this.renderer2.removeClass(this.queueTipElement.nativeElement, 'TipIn'); //Make the tip visible
        this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
        this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipVisible'); //Make the tip visible
      });
    }, 250); 
  }

  endTip() {    
    setTimeout(() => {  //Hide the div with a little delay, in case the DON'T SHOW button is tapped very quickly before the animation ended
      this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class
      this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Hide the tip
      this.showTip2 = false; //Tip div will stay there so the cards don't move, but the buttons will be disabled and the div opacity will be 0 (invisible)
    }, 150);
  }

  ionViewDidLeave(){
    //Remove the visible classes so the animation is not kicked in twice, causing a flickering
    if (this.queueTipElement != undefined) {
      this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class on view leave, if it exists
      this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
    }
    if (this.managerTipElement != undefined) {
      this.renderer2.removeClass(this.managerTipElement.nativeElement, 'tipVisible'); //Remove the visible class on view leave, if it exists
      this.renderer2.addClass(this.managerTipElement.nativeElement, 'tipInitial'); //Make the tip visible
    }
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
      this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted
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

  dontShow(){
    this.endTip(); //Close currently visible tips, then save the setting
    this.setTips(false); //Set the tips value to FALSE
  }

  setTips(value: boolean){    
    this.storage.set('homeTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
  }

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

  selectedLang(lang) {
    if (lang == 'en') {
      this.translate.use('en');
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

  queueManager() {
    //this.navCtrl.push(AdminPage);
    this.navCtrl.parent.select(2); //Used tabIndex in the paranthesis. This function will move the navigator to the Queue Manager Tab
  }

  myQueues() {
    //this.navCtrl.push(QueuesPage);
    this.navCtrl.parent.select(1); //Used tabIndex in the paranthesis. This function will move the avigator to the My Queues Tab
  }

  contactUs() {
    this.navCtrl.push(ContactUsPage);
  }

  openSettings() {
    this.navCtrl.push(SettingsPage);
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
