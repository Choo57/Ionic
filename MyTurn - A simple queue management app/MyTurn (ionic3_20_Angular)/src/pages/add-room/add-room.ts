import { TranslateService } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';
import { Device } from '@ionic-native/device';
import { phpServices } from './../services/phpServices';
import { FormControl, NgForm } from '@angular/forms';
import { Component } from '@angular/core';
import { ViewController, AlertController, Platform, NavParams } from 'ionic-angular';
import { Base64 } from '@ionic-native/base64';
import { File, Entry, FileError } from '@ionic-native/file';
import { Crop } from '@ionic-native/crop';
import { Camera, CameraOptions } from '@ionic-native/camera';

@Component({
  selector: 'page-add-room',
  templateUrl: 'add-room.html',
})

export class AddRoomPage {
  defaultImage = 'assets/imgs/defaultRoomImg40.png';
  blankForm = new FormControl('');
  private deviceUUID: string;
  //photos = new Array<string>();
  base64logo: string;
  //imgPreview: string = 'assets/imgs/img40blue.png';
  hiddenInput = {
    imgURL: this.defaultImage //Default, pre-populated imageURL value on the hidden input field of the form
  };
  currentName: string = '';
  path: string = '';
  fileExtension: string = '';
  finalImg: string = '';
  resizedImageUri: string = '';
  autoTime: boolean = true;
  private mode: string;
  private oldRoomName: string;
  private roomName: string; //Holds the room name that is displayed as the Edit Room inputs' default value
  private passcode: string; //Holds the passcode that is displayed as the Edit Room inputs' default value
  //private formDismissed: number = 0; //Flag to prevent double submission/dismiss of the form if submit button is clicked on twice very fast
  private direction: string;

  constructor(private viewCtrl: ViewController,
    private storage: Storage,
    public navParams: NavParams,
    public phpSrvc: phpServices,
    private alertCtrl: AlertController,
    private device: Device,
    private crop: Crop,
    private base64: Base64,
    public platform: Platform,
    private file: File,
    private camera: Camera,
    private translate: TranslateService) {
    this.mode = this.navParams.get('mode'); //Get the 'mode' passed to the modal (i.e. 'Create' or 'Edit')
    if (this.mode == 'Edit') { //Room name is only passed if "Edit Room" is selected
      this.roomName = this.navParams.get('room'); //Get the 'room' passed to the modal which will be the room name
      this.oldRoomName = this.roomName; //Store the old room name (this.roomName is bound to the input element and will change)
      this.passcode = this.navParams.get('pc'); //Get the 'pc' passed to the modal which will be the room passcode
      this.getRoomImg(this.roomName);
    }
  }

  ionViewDidLoad(){
    this.direction = this.platform.dir(); //Get the plaftorm direction (ltr or rtl) so the form input text fields can be formatted
  }

  onClose() {
    this.viewCtrl.dismiss(this.blankForm);
  }

  onSubmitQueue(form: NgForm) {
    if (!this.device.uuid) {      //Get unique Device UUID (will be null when tested with 'ionic serve')
      this.deviceUUID = 'IonicServeUUID'
    } else {
      this.deviceUUID = this.device.uuid;
    }

    // Connect to database and add the room name, passcode and device UUID
    if (this.mode == 'Create') {
      this.phpSrvc.phpCreateRoom(this.deviceUUID, form.value.roomPasscode, form.value.roomName)
        .then(data => {
          if (data == 'success') {
            if (this.finalImg == '') {
              form.value.imgUrl = this.defaultImage;
              this.viewCtrl.dismiss(form);
            } else {
              // ********* UPLOAD SELECTED IMAGE TO WWW *********  
              this.file.readAsDataURL(this.file.dataDirectory, this.currentName)
              //this.base64.encodeFile(this.finalImg)
                .then((base64File: string) => {
                  var img = new Image();   // Create new img element
                  //img.setAttribute('crossOrigin', 'Anonymous'); //This line prevents large images on IOS from getting loaded!
                  //base64File = base64File.replace('*charset=utf-8', 'jpeg'); //Convert "data:image/*charset=utf-8;base64,/9j" to "data:image/jpeg;base64,/9j"
                  img.onload = (event) => {
                    let newDataUri = this.imageToDataUri(img, 150, 150);
                    // ************ Sending image to Server
                    this.phpSrvc.phpImgUpload(form.value.roomName, this.fileExtension, newDataUri)
                      .then(data => {
                        if (data.result == "false") {
                          this.handleError(this.translate.instant('ERROR_13') + data.image_url);
                        }
                      });
                  };
                  img.src = base64File; // base64 encoded file can be used immediately without waiting for it to load
                  //this.handleError('base64File: ' + JSON.stringify(base64File)); //base64File =  data:image/*charset=utf-8;base64,/9j/4QB....
                  if (form.value.imgUrl == null) {  // If a logo is not picked and the form.value.imgUrl is blank, set it to the default image uri
                    form.value.imgUrl = this.defaultImage;
                  }
                  this.viewCtrl.dismiss(form);
                }, (err) => {
                  console.log(err);
                  this.handleError('Error: ' + JSON.stringify(err) + ' -> resizedImageUri -> ' + this.resizedImageUri);
                });
            }
            //  ********* END OF FILE UPLOAD *********
          } else if (data == "DuplicateRoomName") {
            this.handleError(this.translate.instant('ERROR_12'));
          } else {
            this.handleError(this.translate.instant('ERROR_14'));
          }
        })
        .catch(error => {
          console.log(error);
          this.handleError(this.translate.instant('ERROR_14'));
        })
    } else if (this.mode == 'Edit') {
      this.phpSrvc.phpUpdateRoom(this.oldRoomName, form.value.roomPasscodeEdit, form.value.roomNameEdit) //Pass previous room name (to be edited), new passcode (to be overwritten whatsoever), new room name (to be overwritten whatsoever)
        .then(data => {
          if (data == "DuplicateRoomName") { //Make sure php code excludes the same room name from the "duplicate" check (i.e. if the room is the same, do not mark it as duplicate and proceed)
            this.handleError(this.translate.instant('ERROR_12')) //In this IF statement, new room name is either already exists and cannot be used so (so return the use rback to the form) OR it might be DIFFERENT from the OLD ROOM NAME
          }
          else { //Here, new room name might be same as or different from the old room name (it is for sure different from OTHER ROOM NAMES on the DB)

            if (form.value.roomNameEdit.toUpperCase() != this.oldRoomName.toUpperCase()) { //If the room name changed, modify all the keys saved under the old room name
              //Change the keys  named after the OLD room on internal storage (i.e. create a new key:value pair with the new name & delete the old ones)
              //this.hiddenInput.imgURL is either the default(blank) image or the room image that was saved to phone
              this.changeImgKey(this.hiddenInput.imgURL, form.value.roomNameEdit, this.oldRoomName); //Pass imgURL, new name, old name. This will NOT copy room image if the default image was used (i.e. there were no keys on phone storage that matched)
              this.changeOldKeys(form.value.roomNameEdit, this.oldRoomName); //Pass new name, old name
              if (this.finalImg == '' && this.hiddenInput.imgURL != this.defaultImage) { //If room name changed, BUT the image is the same, rename the file/image name on WWW (only if hiddenInput.imgurl is not defult image, meaning there was a different image that was uploaded, so PHP will find the file)
                this.phpSrvc.phpChangeImgName(this.oldRoomName, form.value.roomNameEdit) //Pass old name & new name
                  .then(nameChanged => { // Delete room image file from WWW
                    if (nameChanged != "changed") {
                      this.handleError(this.translate.instant('ERROR_15'));
                    }
                  })
                  .catch(err => {
                    console.log(err);
                  });
              }
            }

            if (this.finalImg != '') { //If a different image IS selected
              // ********* UPLOAD SELECTED IMAGE TO WWW *********  
              this.file.readAsDataURL(this.file.dataDirectory, this.currentName)
              //this.base64.encodeFile(this.finalImg)
                .then((base64File: string) => {
                  var img = new Image();   // Create new img element
                  //img.setAttribute('crossOrigin', 'Anonymous'); //This line prevents large images on IOS from getting loaded!
                  //base64File = base64File.replace('*charset=utf-8', 'jpeg'); //Convert "data:image/*charset=utf-8;base64,/9j" to "data:image/jpeg;base64,/9j"

                  img.onload = (event) => {
                    let newDataUri = this.imageToDataUri(img, 150, 150);
                    // ************ Send NEW image to WWW
                    this.phpSrvc.phpImgUpload(form.value.roomNameEdit, this.fileExtension, newDataUri)
                      .then(data => {
                        if (data.result == "false") { //If upload failed, display an error
                          this.handleError(this.translate.instant('ERROR_13'));
                        }
                        //*********** Save NEW image to phone internal storage
                        this.storage.set(form.value.roomNameEdit, newDataUri) //Save the room image to phone DB
                          .then(data => {
                            //console.log('Room name:Image URi saved to internal storage'); newDataUri
                            //this.handleError('Saved the logo to device: ' + form.value.imageURL);
                            //*********** DELETE OLD IMAGE from WWW & from PHONE INTERNAL STORAGE ONLY IF the room name changed (otherwise it will delete the newly uploaded image)
                            if (form.value.roomNameEdit.toUpperCase() != this.oldRoomName.toUpperCase()) { //If the room name is different and another image with a different name is uploaded, delete the old one
                              this.phpSrvc.phpDeleteImg(this.oldRoomName) // As this.finalImg is NOT blank, delete the old image from phone and from WWW (whether another image was uploaded or not, delete these files)
                                .then(dataDel => { // Delete room image file from WWW
                                  if (dataDel != "Img_deleted") {
                                    this.handleError(JSON.stringify(dataDel));
                                  }
                                  this.deleteOldRoomLogo(this.oldRoomName); //Delete the image from phone's internal storage                            
                                });
                            }
                            this.viewCtrl.dismiss(form); //DISMISS INSIDE THIS .THEN BLOCK! Otherwise the room image will not be saved correctly and image will not be dispalyed
                          })
                          .catch(err => {
                            console.log('Error could not the logo photo to device');
                            this.handleError(this.translate.instant('ERROR_16') + err);
                          });
                      })
                      .catch(error => { //phpImgUpload FAILED
                        console.log(error);
                        this.handleError(this.translate.instant('ERROR_14'));
                      })
                  };
                  img.src = base64File; // base64 encoded file can be used immediately without waiting for it to load
                }, (err) => {
                  console.log(err);
                  this.handleError('Error: ' + JSON.stringify(err) + ' -> resizedImageUri -> ' + this.resizedImageUri);
                });
              //  ********* END OF FILE UPLOAD *********
            } else {
              this.viewCtrl.dismiss(form);
            }
          }
        })
        .catch(err => {
          console.log(err);
          this.handleError(this.translate.instant('ERROR_17'))
          this.viewCtrl.dismiss(form);
        })
    }
  }

  openGallery() {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.FILE_URI,
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY, //Pick the image from Gallery, NOT from the camera
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true //Without this line, some high definition camera photos were appearing 90 deg rotated inside the avatar
    }

    let cropOptions = {
      quality: 100,
      targetHeight: 150,
      targetWidth: 150
    };

    //this.imagePicker.getPictures(galOptions)
    this.camera.getPicture(options)
      // ** GET THE IMAGE
      .then((cameraImg) => {  
        let mark = cameraImg.indexOf('?'); //Get the index of the question mark in the file name, if it exists
        if (mark != -1 ) { //mark will be = -1 f there are no question marks, otherwise remove the string after the question mark
          cameraImg = cameraImg.substring(0, mark); //Camera image has some numbers after .jpeg extension. Remove anything after ? if there is something
        }            
        //in camera options is NATIVE_URI: On IOS CameraImg -> assets-library://asset/asset.PNG?id=F102BB0C-88AC-44C1-B94C-EB3D69798D8D&ext=PNG
        // if camera options is FILE_URI: On IOS CameraImg -> file:///var/mobile/Containers/Data/Application/47A9D4A7-B59C-41A7-A01C-AAD64EA95C02/tmp/cdv_photo_005.jpg

        //https://beta.ionicframework.com/docs/building/webview/
        //https://forum.ionicframework.com/t/unable-to-display-image-using-file-uri/84977/24
        // Image file URL needs to be converted to http://localhost format in order to be displayed correctly using WebViews
        // so need to use the following convertFileSrc method. Without it, imgURL is file:///data/....
        this.crop.crop(cameraImg, cropOptions)
          // ** CROP THE IMAGE
          .then(croppedImgUrl => { //croppedImgUrl is a cropped copy of the original file; i.e. original file remains intact
            this.currentName = croppedImgUrl.replace(/^.*[\\\/]/, ''); //Get the name of the file using REGULAR EXPRESSIONS
            let mark2 = this.currentName.indexOf('?'); //Get the index of the question mark in the file name, if it exists
            if (mark2 != -1 ) { //mark will be = -1 f there are no question marks, otherwise remove the string after the question mark
              this.currentName = this.currentName.substring(0, mark2); //Camera image has some numbers after .jpeg extension. Remove anything after ? if there is something
            }   
            //this.currentName = this.currentName.substring(0, this.currentName.indexOf('?')); //Cropped image has some numbers after .jpeg exntesion. Remove anything after ? if there is something
            this.path = croppedImgUrl.replace(/[^\/]*$/, ''); //Get the path of the file
            this.fileExtension = this.currentName.substring(this.currentName.indexOf('.')); //Get the characters after & including "." (e.g. if name = 123123.jpg, this.fileExtenstion will be .jpg)
            //this.handleError('this.file.dataDirectory ->' + this.file.dataDirectory); // On android, dataDirectory is shown as: file:///data/user/0/io.ionic.starter/files/
            // ** MOVE THE IMAGE
            this.file.moveFile(this.path, this.currentName, this.file.dataDirectory, this.currentName)
              .then(
                (data: Entry) => {                  
                  this.finalImg = data.nativeURL; //Get the final cropped image to be upload to WWW
                  this.hiddenInput.imgURL = (<any>window).Ionic.WebView.convertFileSrc(data.nativeURL);
                  //this.handleError(this.imgPreview); // To check the file path returned on the actual device during testing
                  //this.handleError('newImgUrl-> ' + newImgUrl + ' :data -> ' + data + ' :data.nativeURL ->' + data.nativeURL); // Show the error
                  //this.file.removeFile(this.path, this.currentName); //Remove the current file. moveFile deletes the original file anyways            
                }
              )
              .catch(
                (err: FileError) => {
                  //       this.path = this.hiddenInput.imgURL; //If anything goes wrong, set the image to the default image
                  this.file.removeFile(this.path, this.currentName); //Remove the current file
                  this.handleError(this.translate.instant('ERROR_18') + JSON.stringify(err.message) + " path: " + this.path + " currentName: " + this.currentName + " file.dataDirectory: " + this.file.dataDirectory + " currentName: " + this.currentName); // Show the error
                  //this.handleError('Move file: path-> ' + path + ' :currentName -> ' + currentName + ' :error ->' + err.message + ' :croppedImage ->' + newImgUrl); // Show the error
                }
              );

          }, (err) => {
            if (err.code != 'userCancelled') {
              this.handleError(this.translate.instant('ERROR_19') + JSON.stringify(err)); // Do not show the error if the user pressed the "Cancel" button during crop operation
            }
          });
      }, (err) => {
        if (err != 'No Image Selected') { //Do not show the error if openGallery is closed without selecting any images
          this.handleError(this.translate.instant('ERROR_20') + JSON.stringify(err)); // Show the error
        }
      });
  }

  imageToDataUri(imageR, width, height): any {
    //https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images  
    // create an off-screen canvas
    var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');

    // set its dimension to target size
    canvas.width = width;
    canvas.height = height;

    // https://stackoverflow.com/questions/20744628/how-to-convert-a-image-from-png-to-jpeg-using-javascript
    ctx.fillStyle = '#008000';  /// set white#fff or green#008000 fill style
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw source image into the off-screen canvas:
    ctx.drawImage(imageR, 0, 0, width, height);

    // encode image to data-uri with base64 version of compressed image
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  private handleError(errorMessage: string) {
    const alert = this.alertCtrl.create({
      title: this.translate.instant('Error'),
      message: errorMessage,
      buttons: [this.translate.instant('OK')]
    });
    alert.present();
  }

  getRoomImg(roomName: string) {
    this.storage.get(roomName) //Room image was already saved as {roomName : logoURL} for each room, if it does not exist use default
      .then(data => {
        if (data != null || data != undefined) {
          this.hiddenInput.imgURL = data; //Set the default Img as the room image if it exists
        }
        //console.log('Room name:Image URi saved to internal storage');
        //this.handleError('Saved the logo to device: ' + form.value.imageURL);
      })
      .catch(err => {
        console.log('Error could not copy the room image');
        this.handleError(this.translate.instant('ERROR_20') + err);
      });
  }

  //Save the room image with the new room name and delete the old one
  changeImgKey(imgURL: string, newRoom: string, oldRoom: string) {
    this.storage.set(newRoom, imgURL) //Save the room image to phone DB
      .then(data => {
        this.deleteOldRoomLogo(oldRoom); //Delete the old room once the imageURL is copied as the new room name key
      })
      .catch(err => {
        console.log('Error could not the logo photo to device');
        this.handleError(this.translate.instant('ERROR_16') + err);
      });
  }

  //DELETE the MEASURE key with the old room name
  changeOldKeys(newRoom: string, oldRoom: string) {
    this.storage.get(oldRoom + 'Measure') //Get the old room setting
      .then(measureVal => {
        this.storage.set(newRoom + 'Measure', measureVal) //Save the settng with the new room name
          .then(_ => { })
          .catch(err => {
            console.log('Error could not save the measure setting');
          });

        this.storage.remove(oldRoom + 'Measure')
          .then(_ => { })
          .catch(err => {
            console.log(err);
          });
      })
      .catch(err => {
        console.log('Error could not copy old measure setting');
      });
  }

  deleteOldRoomLogo(roomName) {
    this.storage.remove(roomName)
      .then(_ => { })
      .catch(err => { console.log(err); });
  }

}