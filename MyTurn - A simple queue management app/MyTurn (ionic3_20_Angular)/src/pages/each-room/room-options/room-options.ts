import { ViewController, NavParams } from 'ionic-angular';
import { Component } from '@angular/core';

@Component({
    selector: 'page-room-options',
    templateUrl: 'room-options.html'
})

export class RoomOptionsPage {

    private autoMeasureTime: boolean;
    private showWaitTime: boolean;

    constructor(private viewCtrl: ViewController, private navParams: NavParams) {}

    ionViewWillEnter(){
        this.autoMeasureTime = this.navParams.get('measureToggle');
        this.showWaitTime = this.navParams.get('showWaitToggle');
    }

    onAction(action: string) {
        this.viewCtrl.dismiss({action: action});//Passing action like this allows us to use the "action" string in the parent page
    }
}