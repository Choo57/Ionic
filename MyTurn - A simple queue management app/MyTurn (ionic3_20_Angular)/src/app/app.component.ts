import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { TabsPage } from '../pages/tabs/tabs';
import { TranslateService } from '@ngx-translate/core';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage: any = TabsPage;

  constructor(platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    public translate: TranslateService) {

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      
      translate.setDefaultLang('en'); //Set the default fallback language as English

      //statusBar.styleDefault();
      // let status bar overlay webview
      //statusBar.overlaysWebView(true); //MADE THE NAVBAR HIDE UNDER THE STATUS BAR SO COMMENTED OUT
      // set status bar to the primary app color
      statusBar.backgroundColorByHexString('#6a89cc');
      //Light text for darker background
      statusBar.styleLightContent();
      splashScreen.hide();
    });
  }
}
