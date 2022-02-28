import { SettingsPage } from './../pages/settings/settings';
import { ContactUsPage } from './../pages/contact-us/contact-us';
import { RoomOptionsPage } from './../pages/each-room/room-options/room-options';
import { FaqPage } from './../pages/faq/faq';
import { Camera } from '@ionic-native/camera';
import { downloadService } from './../pages/services/downloadService';
import { Vibration } from '@ionic-native/vibration';
import { EachRoomPage } from './../pages/each-room/each-room';
import { AddRoomPage } from './../pages/add-room/add-room';
import { Device } from '@ionic-native/device';
import { JoinQueuePage } from './../pages/join-queue/join-queue';
import { AdminPage } from './../pages/admin/admin';
import { QueuesPage } from './../pages/queues/queues';
import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';

import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { EachQueuePage } from '../pages/eachQueue/eachQueue';
import { phpServices } from '../pages/services/phpServices';
import { IonicStorageModule } from '@ionic/storage';
import { Crop } from '@ionic-native/crop';
import { Base64 } from '@ionic-native/base64';
import { File } from '@ionic-native/file';
import { NativeAudio } from '@ionic-native/native-audio';
import { ExpandableComponent } from '../components/expandable/expandable';

//Import these for the translate module
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'; //
import { TranslateHttpLoader } from '@ngx-translate/http-loader';       //
import { HttpClient, HttpClientModule } from '@angular/common/http';    //

export function createTranslateLoader(http: HttpClient) {               //
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');      //
}                                                                       //
//End on translate module import/export

/*import { HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';

export class CustomHammerConfig extends HammerGestureConfig {
  overrides = {
      'press': { time: 2200 }  //set press delay for 2.2 second
  }

  buildHammer(element: HTMLElement) { //Without this code, scrolling gets disabled on the swipe-able list items
    let Hammer: any;                  //https://github.com/hammerjs/hammer.js/issues/1014
    let mc = new Hammer(element, {
      touchAction: "auto",
    });
    return mc;
  }
}  */

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    TabsPage,
    QueuesPage,
    AdminPage,
    EachQueuePage,
    JoinQueuePage,
    AddRoomPage,
    EachRoomPage,
    ExpandableComponent,
    FaqPage,
    RoomOptionsPage,
    ContactUsPage,
    SettingsPage
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicStorageModule.forRoot(),
    IonicModule.forRoot(MyApp),
    HttpClientModule,   //Add this for the translate module and the rest below here
    TranslateModule.forRoot({     //
      loader: {                   //
        provide: TranslateLoader, //
        useFactory: (createTranslateLoader),  //
        deps: [HttpClient]         //
      }                            //
    }) //End of imports for the translate module
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    TabsPage,
    QueuesPage,
    AdminPage,
    EachQueuePage,
    JoinQueuePage,
    AddRoomPage,
    EachRoomPage,
    FaqPage,
    RoomOptionsPage,
    ContactUsPage,
    SettingsPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    phpServices,
    downloadService,
    Device,
    Vibration,
    Base64,
    File,
    Crop,
    Camera,
    NativeAudio,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    //  { provide: HAMMER_GESTURE_CONFIG, useClass: CustomHammerConfig }
  ]
})
export class AppModule { }
