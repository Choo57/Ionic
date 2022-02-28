import { HttpHeaders, HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/fromPromise';
import { Injectable } from '@angular/core';

@Injectable()
export class downloadService {

    private baseURI: string = "https://xxxxxxxxxxxxx";

    constructor(public http: HttpClient) { }

    //Method to download the image from WWW in base64 format
    downloadImg(qName: string): any {
        let headers: any = new HttpHeaders({ 'Content-Type': 'application/json' }),
            options: any = { "qName": qName },
            url: any = this.baseURI + "gI.php";

        return new Promise(resolve => {
            this.http
                .post(url, JSON.stringify(options), headers)
                .subscribe(
                    data => {
                        resolve(data);
                    },
                    error => {
                        resolve(error);
                        console.log('Error during downloading room logo!');
                    }
                );
        });
    }
}
