import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable()
export class phpServices {

    private baseURI: string = "https://xxxxxxxxxxxxxx";

    constructor(public http: HttpClient) { }

    phpQRet(qname: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "retrieve", "qname": qname },
            url: any = this.baseURI + "qRet.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve(error);
                    }
                );
        });
    }

    phpUpdateQueueList(qname: Array<string>): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "updateQueueList", "qname": qname },
            url: any = this.baseURI + "qD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve(error); //Invalid name or passcode entered, so MSQL returned an error
                    }
                );
        });
    }

    phpRetrieveCust(qname: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "retrieve", "qname": qname },
            //url: any = this.baseURI + "gC.php";
            url: any = this.baseURI + "rCU.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve(error);
                    }
                );
        });
    }

    phpRetrieveSelected(qname: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "selected", "qname": qname },
            //url: any = this.baseURI + "gC.php";
            url: any = this.baseURI + "rSE.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve(error);
                    }
                );
        });
    }

    phpValidateQueue(qname: string, pcode: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "validateQ", "qname": qname, "pcode": pcode },
            url: any = this.baseURI + "gC.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve("invalidNP"); //Invalid name or passcode entered, so MSQL returned an error
                    }
                );
        });
    }

    phpValidateQList(qname: Array<string>, pcode: Array<string>): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "validateQList", "qname": qname, "pcode": pcode },
            url: any = this.baseURI + "gC.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve("qListError"); //Invalid name or passcode entered, so MSQL returned an error
                    }
                );
        });
    }

    // Method to create a queue on the DB (by the admin of the queue)
    phpCreateRoom(uuid: string, rPasscode: string, rName: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "createRoom", "uuid": uuid, "rPasscode": rPasscode, "rName": rName },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error.error.text);
                    }
                );
        });
    }


    // Method to change the name and/or passcode of an existing room
    phpUpdateRoom(oldRName: string, rPasscode: string, rName: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "updateRoom", "oldRName": oldRName, "rPasscode": rPasscode, "rName": rName },
            url: any = this.baseURI + "uR.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error.error.text);
                    }
                );
        });
    }

    // Method to add a customer to a room (by the admin of the queue)
    phpAddCustomer(roomName: string, customer: string, wait: number): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "addCustomer", "rName": roomName, "customer": customer, "wait": wait },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

        // Method to edit an existing customer
    phpEditCustomer(roomName: string, editCustomer: string, newCustomer: string, wait: number): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "editCustomer", "roomName": roomName, "editName": editCustomer, "newName": newCustomer, "wait": wait },
            url: any = this.baseURI + "eC.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

    // Method to retrieve the admin rooms using the device UUID
    phpGetAdminRooms(uuid: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "getAdminRooms", "uuid": uuid },
            url: any = this.baseURI + "gC.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

    phpDeleteRoom(roomN: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "deleteAdminRoom", "roomN": roomN },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error.error.text);
                    }
                );
        });
    }

    phpDeleteCustomer(roomN: string, customerN: string, index: number): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "deleteCustomer", "roomN": roomN, "customerN": customerN, "index": index },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error.error.text);
                    }
                );
        });
    }

    phpUpdateOrder(roomN: string, clients: Array<string>, selected: Array<number>): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "updateOrder", "roomN": roomN, "clients": clients, "selected": selected },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpUpdateSelected(roomN: string, customerN: string, selected: number): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "updateSelected", "roomN": roomN, "customerN": customerN, "selected": selected },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpClearAllSelected(roomN: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "clearAllSelected", "roomN": roomN },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpGetRoomCount(qname: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "roomCount", "qname": qname },
            url: any = this.baseURI + "gC.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    };

    phpGetAllCount(qname: Array<string>): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "allCustomerCount", "qname": qname },
            url: any = this.baseURI + "gC.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    };

    phpImgUpload(roomName: string, fileExt: string, fileUri: string): any {
        let url: any = this.baseURI + "uI.php";
        let postData = new FormData();
        postData.append('room', roomName); //First pass the room name, to be used for naming the image file
        postData.append('ext', fileExt); //Then pass the extension of the file; e.g. ".jpg"

        postData.append('file', fileUri);

        return new Promise(resolve => {
            this.http
                .post(url, postData)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpDeleteImg(roomName: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "roomName": roomName },
            url: any = this.baseURI + "dI.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    };

    phpChangeImgName(oldName: string, newName: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = {"key": "changeName", "oldName": oldName, "newName": newName },
            url: any = this.baseURI + "cIn.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    };

    phpUpdateWaitTime(roomN: string, customerN: string, waitTime: number): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "updateWaitTime", "roomN": roomN, "customerN": customerN, "waitTime": waitTime },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpUpdateStartEnd(roomN: string, param: number, clearSelected: boolean): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "updateStartEnd", "roomN": roomN, "param": param, "clearSelected": clearSelected },
            url: any = this.baseURI + "uSE.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpChangeEndText(roomN: string, selected: string, newName: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "changeEndText", "roomN": roomN, "selected": selected, "newName": newName },
            url: any = this.baseURI + "wD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        console.log(data);
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpGetEndText(roomN: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "getEndText", "roomN": roomN },
            //url: any = this.baseURI + "gC.php";
            url: any = this.baseURI + "gET.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        //console.log(error);
                        resolve(error);
                    }
                );
        });
    }

    phpSendMessage(roomN: string, msg: string, dateUTC: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "sendMsg", "roomN": roomN, "msg": msg, "dateUTC": dateUTC },
            url: any = this.baseURI + "sM.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

    phpDownloadMessage(roomN: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "downloadMsg", "roomN": roomN },
            url: any = this.baseURI + "dM.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

    phpGetPasscode(roomN: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "getPasscode", "roomN": roomN },
            url: any = this.baseURI + "gPc.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

    phpGetEachRoomData(roomN: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "getEachRoomData", "roomN": roomN },
            url: any = this.baseURI + "gERD.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

    phpContactUs(name: string, email: string, msg: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "key": "contactUs", "name": name, "email": email, "msg": msg },
            url: any = this.baseURI + "cUsEm.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    (error: any) => {
                        resolve(error);
                    }
                );
        });
    }

}
