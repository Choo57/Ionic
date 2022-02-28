import { NgForm } from '@angular/forms';
import { AddRoomPage } from './../add-room/add-room';
import { Storage } from '@ionic/storage';
import { phpServices } from './../services/phpServices';
import { Client } from './../../models/client';
import { AdminRooms } from './../../models/adminRooms';
import { Component, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { AlertController, NavParams, NavController, PopoverController, ModalController, Platform } from 'ionic-angular';
import { RoomOptionsPage } from './room-options/room-options';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'page-each-room',
  templateUrl: 'each-room.html',
})
export class EachRoomPage {
  @ViewChild('msgArea') msgArea: ElementRef;
  @ViewChild('slidingAnimationStart', {read: ElementRef}) startElement:ElementRef;
  @ViewChild('slidingItem', {read: ElementRef}) clientElement:ElementRef;
  @ViewChild('queueTip', {read: ElementRef}) queueTipElement:ElementRef;
  @ViewChild('secondTip', {read: ElementRef}) secondTipElement:ElementRef;
  //@ViewChildren('slidingItem') public slidingItems: QueryList<ItemSliding>;

  private maxContactLimit: number = 40; //Block adding more than this number of contacts to a room

  private rowNo: number = 2; //Default number of rows of textarea
  private sent: boolean = false;
  private failed: boolean = false;
  private received: boolean = false;
  public msg: string = '';
  private receivedMsg: string = '';
  private dateLocal: string;
  private timeZone; //Variable to hold the time-zone read from internal storage
  private selectedRow: Array<number> = [];
  public adminRoom: AdminRooms;
  private clients: Client[] = [];
  dbItems: Array<any> = [];
  clientNames: Array<string> = [];
  private totalWait: number = 0;
  private totalSeconds: number = 0;
  private minutes: number = 0;
  //private seconds: number = 0;
  private measuredTime: Array<number> = [];
  private measuredTimeStart: number = 0;
  private newTime: Array<number> = [];
  private previousIndex: number = -2; //Start with -2. Setting it to -1 will enable the measurement of the very first client
  private startSelected: number = 0;
  private endSelected: number = 0;
  private startText: string = '- Start -';
  private endText: string = '- End -';
  private ionViewLoaded: boolean = false;
  private autoMeasureTime: boolean;
  private showWaitTime: boolean;
  private passcode: string;
  private languages: string;
  private totalContacts: number;
  private showTip: boolean = false; //Flag to show or hide the div that contains the tip
  private showTip2: boolean = false; //Flag to show or hide the div that contains the tip
  private direction: string; //Text direction read from platform

  constructor(public alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private popOverCtrl: PopoverController,
    private navParams: NavParams,
    public phpSrvc: phpServices,
    private navCtrl: NavController,
    private storage: Storage,
    public element: ElementRef,
    public renderer2: Renderer2,
    public translate: TranslateService,
    private platform: Platform) {
      this.adminRoom = this.navParams.get('room'); //"room" received by navParams is of type AdminRooms with "name", "clients[]" & "imgURL"
    }

  ionViewWillEnter() {  
    this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted 
    this.getLanguage();
    this.getAutoMeasureSettings(); //Retrieve room settings from storage AFTER the room name is retreived through navParams
    this.getShowWaitTimeSettings(); //Retrieve room settings from storage AFTER the room name is retreived through navParams

    this.phpSrvc.phpGetEachRoomData(this.adminRoom.name)
    .then(roomData => {
      //SQL command will return something like below:
      /*
          customer      wait                        qorder    selected
          Start         End                         -9            1
          Passcode      NULL                        -8          NULL
          Good Morning! 2019-01-13T19:21:01.145Z    -7          NULL
          Cust          1                           1             1
          Cust2         4                           2             0
          cUST3         2                           3             0
      */
      //Start/End text will always be at the top at data[0][0] and data[0][1] positions as qorder was set as -9 (lowest possible)

        // getPasscode      phpGetPasscode  gPc.php
        // downloadMessage  phpDownloadMessage  dM.php
        //                  phpGetEndText    getEndText.php
        //                  phpRetrieveCust  retrieveCust.php
        this.passcode = roomData[1][0];
        this.downloadMessage(roomData[2][0], roomData[2][1]);
        this.startText = roomData[0][0]; //First retrieve the start/end text, before the customer list is retrieved so the text are ready for display
        this.endText = roomData[0][1];
        //Check if Start/End text were marked as selected on DB
        if (roomData[0][3] == 0){  
          this.startSelected = 0;
          this.endSelected = 0;
        } else if (roomData[0][3] == 1){
          this.startSelected = 1;
          this.endSelected = 0;
        } else if (roomData[0][3] == 2){
          this.startSelected = 0;
          this.endSelected = 1;
        } else if (roomData[0][3] == 3){
          this.startSelected = 1;
          this.endSelected = 1;
        } // End of Start/End selected check
        if (this.startText == '' || this.startText == null || this.startText == "") {
          this.startText = '- Start -'
        }
        if (this.endText == '' || this.endText == null || this.endText == "") {
          this.endText = '- End -'
        }
        for (let i = 3; i < roomData.length; i++) { 
          let newClient = new Client(roomData[i][0], roomData[i][1]); //roomData[i][0] -> customer name, roomData[i][1] -> waitTime  
          this.clients.splice(i-3,1,newClient);   //Replace the downloaded "Client" arrays in the "clients" array     
          this.selectedRow[i-3] = roomData[i][3]; //Get the selectedRow data from the DB
        };
        this.totalContacts = (this.clients.length);
        this.queueTotalTime();
        this.ionViewLoaded = true; 
        if (roomData.length > 3) { //Meaning if there are any customers added to the room, hide the tip div
          this.setTips(false);
          this.showTip = false; //Hide the tip div
        } else { //If the admin rooms page is blank, check if the tip should be shown
          this.storage.get('eachRoomTips') //Get the tips setting from storage and show/hide the tips accordingly
            .then((tips: boolean) => {
              if (tips == null) { //On the very first run there wont be any saved settings, so tips will be null. Start with the setting enabled (true)
                this.setTips(true); //Save the setting to internal memory if there were no entries for it                
                this.displayTip(true); //Pass true to enable "showTip"
              } else {                 
                this.displayTip(tips);
              }
            })
            .catch(err => { console.log(err); });          
        }
      })
    .catch(error => {
      this.handleError(this.translate.instant('ERROR_2'));
      this.ionViewLoaded = false;
      console.log(error);
    });

    //*** Set "selected" column for all customers as 0 upon every new reopening of the room
    //this.updateStartEndTime(true); //Pass TRUE to clear all selected data (i.w. make SELECTED column 0 for this room)
    //   If you decide to set all selected row to 0, make sure you clear the this.selectedRow array here locally as well
  }

  ionViewDidLoad() { //Do slide animations on ionViewDidLoad
    // Wait to apply slide animations
    setTimeout(() => {  
      console.log('this.clients[0]');
      console.log(this.clients[0]);
      if (this.clients[0] != undefined) { //I decided not to show the "Start" & "End" blocks if the list is empty, so added this if statement here so the animation will not be attempted if the Start element is not displayed on the HTML template    
        this.renderer2.addClass(this.startElement.nativeElement, 'active-slide');  //Slides the item so the button underneath is revealed
        this.renderer2.addClass(this.startElement.nativeElement, 'active-options-right'); //Slides the item so the button underneath is revealed
        this.renderer2.addClass(this.startElement.nativeElement.firstElementChild, 'startAnimation'); //adds the .itemSlidingAnimation class to the html element
        this.renderer2.listen(this.startElement.nativeElement, "animationend", (event) => {
        this.renderer2.removeClass(this.startElement.nativeElement, 'active-slide');  //Close the slided element after the animation ended
        this.renderer2.removeClass(this.startElement.nativeElement, 'active-options-right');
        this.renderer2.removeClass(this.startElement.nativeElement.firstElementChild, 'startAnimation');
        });
      }
    }, 800);    
    setTimeout(() => {
      if (this.clients[0] != undefined) {
        this.renderer2.addClass(this.clientElement.nativeElement, 'active-slide');  //Slides the item so the button underneath is revealed
        this.renderer2.addClass(this.clientElement.nativeElement, 'active-options-right'); //Slides the item so the button underneath is revealed
        this.renderer2.addClass(this.clientElement.nativeElement.firstElementChild, 'clientAnimation'); //addsthe .itemSlidingAnimation class to the html element
        this.renderer2.listen(this.clientElement.nativeElement, "animationend", (event) => {
        this.renderer2.removeClass(this.clientElement.nativeElement, 'active-slide');  //Close the slided element after the animation ended
        this.renderer2.removeClass(this.clientElement.nativeElement, 'active-options-right');
        this.renderer2.removeClass(this.clientElement.nativeElement.firstElementChild, 'clientAnimation');
        });
      }
    }, 800);  
  }

  ionViewDidLeave(){
    //this.updateStartEndTime(true); //If view is closed, pass TRUE to clear all selected data (i.e. make SELECTED column 0 for this room) 
    // If I do the above, I will either need to clear the selectedRow array locally here or get the selected column DB values on ionViewWillEnter

    //Remove the visible classes so the animation is not kicked in twice, causing a flickering
    this.showTip = false; //Hide the div
    this.showTip2 = false; //Hide the div
    if (this.queueTipElement != undefined) {
      this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class on view leave, if it exists
      this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
    }
    if (this.secondTipElement != undefined) {
      this.renderer2.removeClass(this.secondTipElement.nativeElement, 'tipVisible'); //Remove the visible class on view leave, if it exists
      this.renderer2.addClass(this.secondTipElement.nativeElement, 'tipInitial'); //Make the tip visible
    }
  }

  setTips(value: boolean){    
    this.storage.set('eachRoomTips', value) //Set overrides the data in the storage with the new value
      .then(() => {})
      .catch(err => {console.log('Could not save the tips setting')});
  }

  dontShow(){
    this.endTip(); //Close currently visible tips, then save the setting
    this.setTips(false); //Set the tips value to FALSE
  }

  displayTip(displayTip: boolean){
    this.showTip = displayTip;
    setTimeout(() => {
      if (displayTip){ //If true, show the animations
        this.renderer2.addClass(this.queueTipElement.nativeElement, 'TipIn'); //adds the .managerTip class to the html element
        this.renderer2.listen(this.queueTipElement.nativeElement, "animationend", (event) => {
          this.renderer2.removeClass(this.queueTipElement.nativeElement, 'TipIn'); //Make the tip visible
          this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipInitial'); //Make the tip visible
          this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipVisible'); //Make the tip visible
       });
      }
    }, 250); 
  }

  secondTip() {
    this.showTip = false; //Hide the div
    this.showTip2 = true; //Enable the div
    this.renderer2.removeClass(this.queueTipElement.nativeElement, 'tipVisible'); //Remove the visible class
    //this.renderer2.addClass(this.queueTipElement.nativeElement, 'tipInitial'); //Hide the tip

    setTimeout(() => {
      this.renderer2.addClass(this.secondTipElement.nativeElement, 'TipIn'); //adds the .managerTip class to the html element
      this.renderer2.listen(this.secondTipElement.nativeElement, "animationend", (event) => {
        this.renderer2.removeClass(this.secondTipElement.nativeElement, 'TipIn'); //Make the tip visible
        this.renderer2.removeClass(this.secondTipElement.nativeElement, 'tipInitial'); //Make the tip visible
        this.renderer2.addClass(this.secondTipElement.nativeElement, 'tipVisible'); //Make the tip visible
      });
    }, 250);
  }

  endTip() {
    this.showTip2 = false; //Hide the tip div    
    this.renderer2.removeClass(this.secondTipElement.nativeElement, 'tipVisible'); //Remove the visible class
    this.renderer2.addClass(this.secondTipElement.nativeElement, 'tipInitial'); //Hide the tip
  }

  onShowOptions(event: MouseEvent) {
    const popover = this.popOverCtrl.create(RoomOptionsPage, { measureToggle: this.autoMeasureTime, showWaitToggle: this.showWaitTime }, {cssClass: 'menu-options'}); //Pass the value of autoMeasureTime toggle setting so it is displayed correctly on the popover
    popover.present({ ev: event }); //Assign the event object sent thourgh the HTML object, so the popover opens where the menu sits and not in the middle of the page
    popover.onDidDismiss(
      data => {
        if (data != undefined || data != null) { //If popover is closed by selecting outside the popover area, data will be null, so don't do anything if that is the case 
          if (data.action == 'delete') {
            this.onDeleteRoom();
          } else if (data.action == 'edit') {
            this.onEditRoom();
          } else if (data.action == 'add') {
            this.onAddCustomer('new', null, null, null); //To add a new customer, pass the keyword 'new'. Other 2 variables are for editting the customer, so pass null for them for this case
          } else if (data.action == "autoMeasure") {
            this.MeasureTime();
          } else if (data.action == "showWaitTime") {
            this.setShowWaitTime();
          }
        }
      }
    )
  }

  onDeleteRoom() {
    const prompt = this.alertCtrl.create({
      title: this.translate.instant('DELETE_ROOM'),
      buttons: [
        {
          text: this.translate.instant('Cancel'),
          handler: data => {
            //console.log('Cancel clicked');
          }
        },
        {
          text: this.translate.instant('DELETE'),
          handler: _ => {
            let navTransition = prompt.dismiss();  //Info about how to use navCtrl.pop inside an alertCtrl: https://ionicframework.com/docs/api/components/alert/AlertController/#advanced
            this.phpSrvc.phpDeleteRoom(this.adminRoom.name)
              .then(data => {
                if (data == "Success2") {
                  this.deleteRoomLogo(this.adminRoom.name); //Delete the room name:imageURi pair from internal storage
                  this.deleteRoomSettings(this.adminRoom.name); //Delete the room settings from internal storage
                  if (this.adminRoom.imgURL != 'assets/imgs/defaultRoomImg40.png') {  // Only attempt to delete image from WWW if the default image is not used
                    this.phpSrvc.phpDeleteImg(this.adminRoom.name)
                      .then(dataDel => { // Delete room image file from WWW
                        if (dataDel != "Img_deleted") {
                          this.handleError(JSON.stringify(dataDel));
                        }
                      });
                  }
                  navTransition.then(() => {
                    this.navCtrl.pop(); //Return to the Admin Rooms page
                  });
                } else {
                  this.handleError(this.translate.instant('ERROR_3'));
                }
              });
            return false;
          }
        }
      ]
    });
    prompt.present();
  }

  onAddCustomer(mode: string, editClient: Client, editIndex: number, ev: Event) {
    this.showTip = false; //Hide the tip div
    this.setTips(false);
    if (ev != null) { //Null is passed for the event if "Add Contact" menu is selected from the upper right hand corner
      ev.stopPropagation(); //event.stopPropogarion will prevent the onClickCustomer from gettig triggered when EDIT or DELETE butttons are clicked
    }
    const prompt = this.alertCtrl.create({
      title: (mode == 'new' ? this.translate.instant('Add contact') : this.translate.instant('Edit: ') + editClient.name),
      cssClass: 'redMessage',
      message: '',
      inputs: [
        {
          name: 'name',
          value: (mode == 'new' ? '' : editClient.name),
          placeholder: (mode == 'new' ? this.translate.instant('Name') : editClient.name)
        },
        {
          name: 'waitTime',
          type: 'number',
          value: (mode == 'new' ? '' : String(editClient.waitTime)),
          placeholder: (mode == 'new' ? this.translate.instant('Wait time (minutes)') : String(editClient.waitTime))
        },
      ],
      buttons: [
        {
          text: this.translate.instant('Cancel'),
          handler: data => {
          }
        },
        {
          text: (mode == 'new' ? this.translate.instant('Add') : this.translate.instant('Update')),
          handler: dataHandler => {           
            let customerExists = this.duplicateName(dataHandler, editClient);
            let nameBlank = this.blankName(dataHandler);
            let longName = this.nameTooLong(dataHandler);
            if (customerExists) { // Check if the same name already exists (same name is not handled correctly when reordering clients, both names qorder on DB gets updated to the last value, so preventing same name entry will be easier than fixing it)
              prompt.setMessage('"' + dataHandler.name + '"' + this.translate.instant(' already exists.'));
              return false;
            } else if (nameBlank) { // If Name field was left blank, prompt a message and return to the alertCtrl
              prompt.setMessage(this.translate.instant('\"Name\" cannot be blank'));
              return false;
            } else if (longName) { // If Name entered is too long, prompt a message and return to the alertCtrl
              prompt.setMessage(this.translate.instant('"Name" too long'));
              return false;
            } else if (this.totalContacts >= this.maxContactLimit) { // If Name entered is too long, prompt a message and return to the alertCtrl
              prompt.setMessage(this.translate.instant('Max_contact_limit', {'limit': this.maxContactLimit}));
              return false;
            } else {
              if (dataHandler.waitTime == '') {
                if (mode == 'new') {
                  dataHandler.waitTime = 0; //If waittime was left blank for a new client, assign 0 as the default value
                } else if (mode == 'edit') {
                  dataHandler.waitTime = editClient.waitTime; //If waittime was left blank for an editted client, leave the previous value
                }
              }
              if (mode == 'new') {
                this.phpSrvc.phpAddCustomer(this.adminRoom.name, dataHandler.name, dataHandler.waitTime)
                  .then(data => {
                    if (data.message == "Success1") {
                      this.clients.push(new Client(dataHandler.name, dataHandler.waitTime)); //If we can write to DB, add it to the list, else don't do it
                      this.queueTotalTime(); //Recalculate wait time
                      this.totalContacts = (this.clients.length);
                    } else {
                      console.log(data);
                      this.handleError(this.translate.instant('ERROR_4'));
                    }
                  });
              } else if (mode == 'edit') {
                this.phpSrvc.phpEditCustomer(this.adminRoom.name, editClient.name, dataHandler.name, dataHandler.waitTime)
                  .then(data => {
                    if (data.message == "Success1") {
                      let newClient = new Client(dataHandler.name, dataHandler.waitTime);
                      this.clients.splice(editIndex, 1, newClient); //Remove the editted client and replace it with the new client (which is of thype Client and contains a name & a waittime)
                      //this.clients.push(new Client(dataHandler.name, dataHandler.waitTime)); //If we can write to DB, add it to the list, else don't do it
                      this.queueTotalTime(); //Recalculate wait time
                    } else {
                      console.log(data);
                      this.handleError(this.translate.instant('ERROR_5'));
                    }
                  })
                  .catch(Err => {
                    this.handleError(this.translate.instant('ERROR_5'));
                  });
              }
            }
          }
        }
      ]
    });
    prompt.present();
  }

  duplicateName(data, editClient) { //Prevent the same name from being entered. If a customer is being editted, allow the old name to stay the same
    for (let i = 0; i < this.clients.length; i++) {
      if (this.clients[i].name.toLowerCase() == data.name.toLowerCase()) {
        if (editClient != null && (data.name.toLowerCase() == editClient.name.toLowerCase())){ //editClient will be NULL if mode==new. If a contact is being editted, allow the same name to be used
          return false;
        } else {
          return true;
        }        
      }
    }
    return false;
  }

  blankName(data) { //Check if the name field is left blank
    if (data.name == '') {
      return true;
    }
    return false;
  }

  nameTooLong(data) { //Check if the name entered is longer then 32 characters
    if (data.name.length > 24) {
      return true;
    }
    return false;
  }

  onDeleteCustomer(client: Client, index: number, ev: Event) {
    ev.stopPropagation(); //event.stopPropogarion will prevent the onClickCustomer from gettig triggered when EDIT or DELETE butttons are clicked
    this.previousIndex = index - 1; //
    this.selectedRow.splice(index, 1); //Clear the selected row
    this.newTime.splice(index, this.clients.length - index); //Clear the newTime measured for this deleted customer and for all customers that follow      
    this.clients.splice(index, 1);
    this.phpSrvc.phpDeleteCustomer(this.adminRoom.name, client.name, index).then(data => { //Send index too (index == qorder on database) so the exact customer is deleted (in case the same name appears twice)
      if (data == "Success3") {
        this.queueTotalTime(); //Recalculate wait time
      } else {
        this.handleError(this.translate.instant('ERROR_3'));
      }
    });
  }

  onClickCustomer(client: Client, index: number) {
    //this.closeAllItems(); //Close any items that were slided right to reveal the DEL button after a (press)
    this.selectedRow[index] = (this.selectedRow[index] ? 0 : 1); //Toggle the selectedRow between 1 and 0

    if (this.autoMeasureTime) { //Only measure wait time if the setting is enabled
      if (this.selectedRow[index] == 0) { //If the customer is 'unselected', set the respective newTime element to -1
        this.newTime[index] = null;
        this.previousIndex = -2; //If the customer is unselected, reset the previousIndex to -2 so timemeasurement will stop
      }
      if (this.selectedRow[index] == 1) { //Only measure time if the client was not served (i.e. when the client is 'unclicked/already green' do not measure time)
        this.measuredTime[index] = performance.now();
        //if ((index != 0) && (index != (this.clients.length - 1)) && (index == (this.previousIndex + 1))) { //If it is not the very first or last entry that is selected (i.e. "start" or "end") AND the clients are selected in he correct order, without jumping from one client to another one that is 2 rows after
        if (index == (this.previousIndex + 1)) {
          if (index == 0) { //for the very first customer where index = 0, use the this.measuredtimeStart variable as there is no this.measuredTime[-1]
            this.totalSeconds = Math.round((this.measuredTime[index] - this.measuredTimeStart) / 1000);
          } else {
            this.totalSeconds = Math.round((this.measuredTime[index] - this.measuredTime[index - 1]) / 1000);
          }
          if (this.totalSeconds > 60) {
            this.minutes = Math.floor(this.totalSeconds / 60);
            //this.seconds = this.totalSeconds - this.minutes * 60;
          } else {
            this.minutes = 0; //If time measured is between 0-60 seconds, store 0 on the newTime array
            //this.seconds = 0;
          }
          if (this.clients[index].waitTime != this.minutes) { //If measured time is different, record it to this.newTime, otherwise this.newTime[index] will be null & there won't be any suggestions
            this.newTime[index] = this.minutes; //Time resolution in minutes (not seconds)
          }
        }
        this.previousIndex = index; // Record the index of the customer that was just pressed to be a reference for the next click
      }
    }

    this.queueTotalTime();

    //*** update the database with the new order
    this.phpSrvc.phpUpdateSelected(this.adminRoom.name, client.name, this.selectedRow[index])
    .then(data => {
      if (data == "SelectedUpdated") {
      } else {
        this.handleError(this.translate.instant('ERROR_6'));
      }
    });
  }

  reorderItems(indexes) {
    for (let i = 0; i < this.clients.length; i++) {
      if (this.selectedRow[i] == undefined){
        this.selectedRow[i] = 0; //Fill in the NULL elements of the selectedRow array
      }
    }

    let selectedMoved = this.selectedRow[indexes.from]; //Get the selectedRow element that should be moved with the client
    this.selectedRow.splice(indexes.from, 1); //Remove the selectedRow element from that array position
    this.selectedRow.splice(indexes.to, 0, selectedMoved); //Add the selectedRow element to new array position
    

    let element = this.clients[indexes.from]; //Get the client that is being moved
    this.clients.splice(indexes.from, 1); //Remove the client from that array position
    this.clients.splice(indexes.to, 0, element); //Add the client to new array position
    this.newTime.splice(0, this.newTime.length); //Clear the newTime measured

    for (let i = 0; i < this.clients.length; i++) {
      this.clientNames[i] = this.clients[i].name;
    }

    //*** update the database with the new order & selected rows
    this.phpSrvc.phpUpdateOrder(this.adminRoom.name, this.clientNames, this.selectedRow)
    .then(data => {
      console.log(data);
      if (data == "OrderUpdated") {
      } else {
        this.handleError(this.translate.instant('ERROR_7'));
      }
    })
    .catch(err => {
      console.log(err);
      this.handleError(this.translate.instant('ERROR_7'));
    });    
  }

 /* reorderItems(indexes) {
    let element = this.clients[indexes.from]; //Get the client that is being moved
    this.clients.splice(indexes.from, 1); //Remove the client from that array position
    this.clients.splice(indexes.to, 0, element); //Add the client to new array position
    this.newTime.splice(0, this.newTime.length); //Clear the newTime measured

    for (let i = 0; i < this.clients.length; i++) {
      this.clientNames[i] = this.clients[i].name;
    }

    //*** update the database with the new order
    this.phpSrvc.phpUpdateOrder(this.adminRoom.name, this.clientNames).then(data => {
      if (data == "OrderUpdated") {
      } else {
        this.handleError(this.translate.instant('ERROR_7'));
      }
    });

    //If moved client is below or under the list of already highlitged (in green) clients
    // highlight it accordingly depeding on where the client was dropped to
    // If an unserviced (not green) client was pulled up from the bottom of the list to within already serviced clients (green),
    // set it to green and update the database accordingly. Vice versa.
    if (this.selectedRow[indexes.to] == undefined) { //If the array elements are not defined yet, set them 0 so they can be compared with 0 values correctly
      this.selectedRow[indexes.to] = 0;
    }
    if (this.selectedRow[indexes.from] == undefined) { //If the array elements are not defined yet, set them 0 so they can be compared with 0 values correctly
      this.selectedRow[indexes.from] = 0;
    }
    if (this.selectedRow[indexes.to] != this.selectedRow[indexes.from]) {
      if (indexes.to > indexes.from) {
        const position = (this.selectedRow.reduce((a, b) => a + b, 0)) - 1;
        this.selectedRow[position] = 0; //.reduce((a, b) => a + b, 0) gives the sum of array elements. Set the last value of this.selectedRow to 0
        //*** update the database with the new order
        this.phpSrvc.phpUpdateSelected(this.adminRoom.name, this.clientNames[indexes.to], 0).then(data => {
          if (data == "SelectedUpdated") {
          } else {
            this.handleError(this.translate.instant('ERROR_6'));
          }
        });
        this.phpSrvc.phpUpdateSelected(this.adminRoom.name, this.clientNames[position], 0).then(data => {
          if (data == "SelectedUpdated") {
          } else {
            this.handleError(this.translate.instant('ERROR_6'));
          }
        });

      } else {
        const position = (this.selectedRow.reduce((a, b) => a + b, 0));
        if (position != 0) { //If the customer is moved to the top (index 0) & there are no other selected customers (i.e. position=0), do not set the last selectedRow position to 1. Otherwise, as there will be a new customer added to the list, highlight one more element as selected (i.e. the one after the last) 
          this.selectedRow[position] = 1; //.reduce((a, b) => a + b, 0) gives the sum of array elements. Set one more element of this.selectedRow to 1
        }
        //*** update the database with the new order
        this.phpSrvc.phpUpdateSelected(this.adminRoom.name, this.clientNames[indexes.to], 1).then(data => {
          if (data == "SelectedUpdated") {
          } else {
            this.handleError(this.translate.instant('ERROR_6'));
          }
        });
        this.phpSrvc.phpUpdateSelected(this.adminRoom.name, this.clientNames[position], 1).then(data => {
          if (data == "SelectedUpdated") {
          } else {
            this.handleError(this.translate.instant('ERROR_6'));
          }
        });
      }
      // END OF updating the selected status of ordered clients
    }
  }    */

  deleteRoomLogo(roomName) {
    this.storage.remove(roomName)
      .then(
        _ => {
          //console.log('Saved Room Image deleted!')
        }
      )
      .catch(
        err => {
          console.log(err);
        }
      );
  }

  deleteRoomSettings(roomName) {
    this.storage.remove(roomName + 'Measure')
      .then(
        _ => {
          //console.log('Saved Room Image deleted!')
        }
      )
      .catch(
        err => {
          console.log(err);
        }
      );
  }

  queueTotalTime() {
    let tempWait = 0;
    for (let i = 0; i < this.clients.length; i++) { //data is a 2 dimensional array of {customer, waitTime} in each row
      let w = +this.clients[i].waitTime; //Cast any possible string values to integer. If waitTime is null, putting + infront will convert it to 0.  parseInt(null) returns NaN.
      if (this.clients[i].waitTime == 0) {
        w = 1; //If the waittime is 0 (meaning the measured time is <1min, assume 1 minute for the time calculation)
      }
      tempWait += w;
    }

    for (let i = 0; i < this.selectedRow.length; i++) {
      if (this.selectedRow[i]) {
        tempWait -= this.clients[i].waitTime;
        if (this.clients[i].waitTime == 0) {
          tempWait -= 1; //If the waittime is 0 (meaning the measured time is <1min, assume 1 minute for the time calculation)
        }
      }
    }

    this.totalWait = tempWait;
  }

  MeasureTime() {
    this.autoMeasureTime = (this.autoMeasureTime == null ? false : !this.autoMeasureTime); //Toggle the auto measure wait time setting and write it to memory. If null, set it to false and save to local storage
    this.storage.set(this.adminRoom.name + 'Measure', this.autoMeasureTime) //Set overrides the data in the storage with the new value
      .then(data => {//console.log('Saved the vibrate setting');
        })
      .catch(err => {console.log('Could not save the vibration setting')
        });
    if (!this.autoMeasureTime) { //If this.autoMEasureTime is FALSE, clear the newTime array
      this.newTime = [];
    } else if (!this.showWaitTime) { //If this.autoMeasureTime is TRUE, you have to display wait time as well. So check if this.showWaitTime is FALSE and if o, toggle it to TRUE
      this.setShowWaitTime(); //This will be run of this.autoMeasureTime is changed to TRUE && if this.showWaitTime is FALSE, so it will be toggled to TRUE
    }

  }

  getAutoMeasureSettings() {
    this.storage.get(this.adminRoom.name + 'Measure')
      .then((measureSet: boolean) => {
        if (measureSet == null) { //On the very first run there wont be any saved settings, so measureSet will be null. Start with the setting disabled (false)
          this.MeasureTime(); //Save the setting to internal memory if there were no entries for it
          //this.autoMeasureTime = true;
        } else {
          this.autoMeasureTime = measureSet;
        }
      })
      .catch(err => {
        console.log(err);
        console.log('Could not retrieve the vibration setting');
      });
  }

  getShowWaitTimeSettings() {
    this.storage.get(this.adminRoom.name + 'showWait')
      .then((measureSet: boolean) => {
        if (measureSet == null) { //On the very first run there wont be any saved settings, so measureSet will be null. Start with the setting enabled (true)
          this.setShowWaitTime(); //Save the setting to internal memory if there were no entries for it
          //this.autoMeasureTime = true;
        } else {
          this.showWaitTime = measureSet;
        }
      })
      .catch(err => {
        console.log(err);
        console.log('Could not retrieve the vibration setting');
      });
  }

  setShowWaitTime() {
    this.showWaitTime = (this.showWaitTime == null ? true : !this.showWaitTime); //Toggle the show wait time setting and write it to memory. If null, set it to true and save to local storage
    this.storage.set(this.adminRoom.name + 'showWait', this.showWaitTime) //Set overrides the data in the storage with the new value
      .then(data => {//console.log('Saved the vibrate setting');
        })
      .catch(err => {console.log('Could not save the vibration setting')
        });
    if (!this.showWaitTime && this.autoMeasureTime) { //If this.showWaitTime is FALSE, disable the this.autoMeasureTime (no point auto measuring time if waittime is disabled). Check if this.autoMeasureTime is true, if so toggle it
      this.MeasureTime(); //This will be run of this.autoMeasureTime is TRUE, so it will be toggled to FALSE
    }

  }

  onAcceptTime(indexA) {
    this.phpSrvc.phpUpdateWaitTime(this.adminRoom.name, this.clients[indexA].name, this.newTime[indexA])
      .then(data => {
        if (data == "WaitTimeUpdated") {
          this.clients[indexA].waitTime = this.newTime[indexA]; //Update wait time if DB was updated successfully
          this.newTime[indexA] = null; //Clear the proposed new time
        } else {
          this.handleError(this.translate.instant('ERROR_8'));
        }
      });
  }

  onClickStart() {
    this.measuredTimeStart = performance.now();
    this.startSelected = this.startSelected ? 0 : 1; //Toggle the value
    if (this.startSelected) { //If the start item is selected and it turns green, start measuring time
      this.previousIndex = -1; //Set this to -1 so time measurements begins when the "-Start-" item is clicked on (i.e. index == (this.previousIndex + 1) will be true for the first array index of 0)      
    } else {
      this.previousIndex = -2; //If "-Start-" is unselected, set previousIndex to -2 so there won't be an auto suggestion for time update
    }
    this.updateStartEndTime(false); //Pass FALSE so the selected column is not set to all 0
  }

  onClickEnd() {
    //this.endSelected = this.endSelected ? 0 : 1; //Toggle the value
    //When the -End- item is tapped, clear all selected rows and update the DB accordingly
    this.selectedRow.fill(0); //Set all values to 0 so all contacts will be unselected
    this.startSelected = 0; //Unselect start block as well
    this.newTime = []; //Clear the newTime array so all proposed times will be cleared and wont be displayed
    //*** update the database with the new order
    this.queueTotalTime();
    this.phpSrvc.phpClearAllSelected(this.adminRoom.name)
      .then(data => {
        if (data == "SelectedUpdated") {
        } else {
          this.handleError(this.translate.instant('ERROR_6'));
        }
      });
    //this.updateStartEndTime();
    this.previousIndex = -2; //If "-End-" is selected, set previousIndex to -2 so there won't be an auto suggestion for time update
  }

  updateStartEndTime(clearSelected: boolean) {
    let param: number = 0;
    // Pass 0: both Start/End are not selected, 1: only Start selected, 2: only End selected, 3: both Start/End are selected
    if (this.startSelected && !this.endSelected) { //If only Start is selected
      param = 1;
    } else if (this.startSelected && this.endSelected) { //If both Start/End are selected
      param = 3;
    } else if (!this.startSelected && this.endSelected) { //If only End is selected
      param = 2;
    } else { //Both Start/End are NOT selected
      param = 0;
    }

    if (clearSelected) { //Unselect Start & End if all contacts will be unselected
      param = 0;
      this.selectedRow.fill(0); //Set all values to 0 so all contacts will be unselected
    }

    this.phpSrvc.phpUpdateStartEnd(this.adminRoom.name, param, clearSelected)
      .then(data => {
        if (data != "StartEndUpdated") {
          this.handleError(this.translate.instant('ERROR_9'));
        }
      });
  }

  msgKeyUp() {
    this.sent = false; //Clear the green "sent" notification
    this.failed = false; //Clear the red "failed" notification
    this.msgArea.nativeElement.style.height = 'auto';
    if (this.msgArea.nativeElement.scrollHeight < 44) { //parseInt(this.msgArea.nativeElement.style.height) discards tp 'px' at the end of 
      this.msgArea.nativeElement.style.height = '44px'; //44px seems to be the height of 2 rows
    } else {
      this.msgArea.nativeElement.style.height = this.msgArea.nativeElement.scrollHeight + 'px';
    }
  }

  onSendMsg(mode: string) {
    if (mode == 'clearMsg') {      
      this.msg = '';
      this.received = false;
    }
    this.sent = false; //Clear the green "sent" notification
    this.failed = false; //Clear the red "failed" notification
    
    //Send UTC time to DB
    let date = new Date();
    let dateUTC: string = date.toISOString(); // ISOString time format:   2019-01-11T08:11:21.326Z      
    //let dateLocal: string = new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString(); //Gets you the local time on the device
    //dateLocal = '(' + dateLocal.substr(8,2) + '-' + dateLocal.substr(5,2) + '-' + dateLocal.substr(0,4) + ', ' + dateLocal.substr(11,2) + ':' + dateLocal.substr(14,2) + ')';

    this.phpSrvc.phpSendMessage(this.adminRoom.name, this.msg, dateUTC)
      .then(data => {
        if (data == "msgSent") {
          if (mode == 'sendMsg') {
            this.msg = ''; //Clear the textarea after message is sent
            this.sent = true;
            this.phpSrvc.phpDownloadMessage(this.adminRoom.name)
              .then(message => {
                this.downloadMessage(message[0], message[1]); //Format message text and date
              });            
          }
        } else {
          this.failed = true;
          console.log(data);
        }
      })
      .catch(err => {
        this.handleError(this.translate.instant('ERROR_10'));
        console.log(err);
      });
  }

  downloadMessage(msgText: string, msgTime: string) {
    this.storage.get('timeZone')
      .then((tz: number) => {
        this.timeZone = tz;

        if (msgText == null || msgText == '') {
          this.received = false;
          this.receivedMsg = '';
        } else {
          this.receivedMsg = msgText.replace(new RegExp("&#10;", "g"), "\n"); //Need to use a "white-space: pre-wrap !important;" in the CSS class for the \n to be displayed as a new line. .replace(new RegExp("&#10;", "g"), "\n") -> replaces ALL occurences with \n
          //this.receivedMsg = msgText.replace("&#10;", "\n"); //Only replaces the first occurence on "&#10;
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
          }
        }

      })
      .catch(err => {
        console.log(err);
      });

  }

  //Press on Start or End blocks to change the text
  //The strings "Start" and "End" passed on should not be changed to a different text, 
  //they are used by php to idnetify the DB columns that will be written on
  onPressEdges(pressed: string) {
    const prompt = this.alertCtrl.create({
      title: this.translate.instant('Edit: ') + pressed,
      cssClass: 'redMessage',
      message: '',
      inputs: [
        {
          name: 'name',
          value: pressed
        },
      ],
      buttons: [
        {
          text: this.translate.instant('Cancel'),
          handler: data => {
          }
        },
        {
          text: this.translate.instant('UPDATE'),
          handler: dataHandler => {            
            let nameBlank = this.blankName(dataHandler);
            let longName = this.nameTooLong(dataHandler);
            if (nameBlank) { // If Name field was left blank, prompt a message and return to the alertCtrl
              prompt.setMessage(this.translate.instant('Cannot be left blank'));
              return false;
            } else if (longName) { // If Name entered is too long, prompt a message and return to the alertCtrl
              prompt.setMessage(this.translate.instant('Text too long'));
              return false;
            } else {
              //Send new text to DB
              if (pressed == this.startText) {
                pressed = 'Start';
              } else if (pressed == this.endText) {
                pressed = 'End';
              }
              this.phpSrvc.phpChangeEndText(this.adminRoom.name, pressed, dataHandler.name)
                .then(data => {
                  if (data == "updated") { //If DB is updated successfully, update the displayed the text now
                    if (pressed == 'Start') {
                      this.startText = dataHandler.name;
                    } else if (pressed == 'End') {
                      this.endText = dataHandler.name;
                    }
                  } else {
                    this.handleError(this.translate.instant('ERROR_9'));
                  }
                });
            }
          }
        }
      ]
    });
    prompt.present();
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

 /* getPasscode() {
    this.phpSrvc.phpGetPasscode(this.adminRoom.name)
    .then(pc => {
      this.passcode = pc;
    })
    .catch(err => {
      console.log(err);
    });
  }  */

  onEditRoom() {
    const modal = this.modalCtrl.create(AddRoomPage, {mode: 'Edit', room: this.adminRoom.name, pc: this.passcode}); //Pass mode & room name. Room image is saved on internal storage (if it exists), passcode to be retrieved from DB
    modal.present();
    // Format of data received from the form: {roomName: "Test Room", roomPasscode: "passcode", imageURL: "assets/imgs/img40blue.png"}
    modal.onDidDismiss((form: NgForm) => {    // Receive the form from the Modal through onDidDismiss 
      if (form.submitted) { //The form element passed will be null if "Cancel" button was pressed. Add the values if submit was clicked
        this.adminRoom.name = form.value.roomNameEdit;
        this.passcode = form.value.roomPasscodeEdit; //Get the changed password here again so if the Edit Room is visited immediately again the correct new passcode is displayed
        //New image was already uploaded to WWW and saved to phone internal storage in the add-room 'Edit' function
        //Old image was also deleted in the same function
      } 
    }) 
  }

  onLoadRoom(room: AdminRooms, i: number) {
    this.navCtrl.push(EachRoomPage, { room: room }); //Pass the Room Name
  }

  private handleError(errorMessage: string) {
    const alert = this.alertCtrl.create({
      title: this.translate.instant('Error'),
      message: errorMessage,
      buttons: [this.translate.instant('OK')]
    });
    alert.present();
  }

  // Function to reveal the "DEL" button if customer is "pressed" on a customer's name. Note that (press) should come before (tap) on the html template otherwise both will get fired!
  // https://github.com/ionic-team/ionic/issues/7440
  /*  public onPressCustomer(item: any) {
      console.log(item);
      // This is to prevent a call to itemSliding.close() in the template
      //$event.stopPropagation();
      // Close all other open items to have behavior similar to the drag method
      this.closeAllItems();
  
      setTimeout(() => {
        // In order for the width of the buttons to be calculated the item
         // must be slightly opened
        item._setOpenAmount(1);
  
        const children = Array.from(
          // use _leftOptions if buttons are on the left (could be made to be dynamic)
          item._rightOptions._elementRef.nativeElement.children,
        );
        // Calculate the width of all of the buttons
        const width = children.reduce(
          (acc: number, child: HTMLElement) => acc + child.offsetWidth,
          0,
        );
  
        // Open to the calculated width
        item.moveSliding(width);
        item._setOpenAmount(width, false);
      }, 0); //Only reveal the DEL button after 2.2 seconds, so when a user does a press on the re-order icon to move the contact the DEL button is not revealed quickly
  
    } 
  
    //closeAllItems is part of the onPressCustomer method
    private closeAllItems() {
      this.slidingItems.map(item => {
        item.close();
      }); 
    }   */

}