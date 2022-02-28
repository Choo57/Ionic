import { Storage } from '@ionic/storage';
import { Component } from '@angular/core';

import en_faqRooms from '../../models/faq/en_faqRooms';
import en_faqQueues from '../../models/faq/en_faqQueues';
import en_faqGeneral from '../../models/faq/en_faqGeneral';
import tr_faqRooms from '../../models/faq/tr_faqRooms';
import tr_faqQueues from '../../models/faq/tr_faqQueues';
import tr_faqGeneral from '../../models/faq/tr_faqGeneral';
import ar_faqRooms from '../../models/faq/ar_faqRooms';
import ar_faqQueues from '../../models/faq/ar_faqQueues';
import ar_faqGeneral from '../../models/faq/ar_faqGeneral';
import gr_faqRooms from '../../models/faq/gr_faqRooms';
import gr_faqQueues from '../../models/faq/gr_faqQueues';
import gr_faqGeneral from '../../models/faq/gr_faqGeneral';

@Component({
  selector: 'page-faq',
  templateUrl: 'faq.html',
})

export class FaqPage {
  faqGeneral: { expanded: boolean, heading: string, text: string }[];
  faqRooms: { expanded: boolean, heading: string, text: string }[];
  faqQueues: { expanded: boolean, heading: string, text: string }[];

  languages: string;
  items: any = [];
  itemExpandHeight: number = 135;

  constructor(private storage: Storage) {
    this.storage.get('lang') //Read the language setting so senteces on the template can be formatted correctly for each language
      .then((lang: string) => {
        if (lang == null) { //On the very first run there wont be any saved settings, so lang will be null. Start with the default language as "en"
          this.languages = "en";
        } else {
          this.languages = lang;
        }

        if (this.languages == 'en') {
          this.faqRooms = en_faqRooms;
          this.faqQueues = en_faqQueues;
          this.faqGeneral = en_faqGeneral;
        } else if (this.languages == 'tr') {
          this.faqRooms = tr_faqRooms;
          this.faqQueues = tr_faqQueues;
          this.faqGeneral = tr_faqGeneral;
        } else if (this.languages == 'ar') {
          this.faqRooms = ar_faqRooms;
          this.faqQueues = ar_faqQueues;
          this.faqGeneral = ar_faqGeneral;
        } else if (this.languages == 'gr') {
          this.faqRooms = gr_faqRooms;
          this.faqQueues = gr_faqQueues;
          this.faqGeneral = gr_faqGeneral;
        }

      })
      .catch(err => { console.log(err); });
  }

  // How the expanding components work
  // https://www.joshmorony.com/creating-an-accordion-list-in-ionic/
  // I had to manually enter "ExpandableComponent" under "@NgModule -> declarations" on app.module.ts, no need to enter it also under "entryComponents" in app.module.ts

  expandRooms(i) {
    this.faqRooms[i].expanded = (this.faqRooms[i].expanded ? false : true);
    return this.faqRooms[i].expanded
  }

  expandQueues(i) {
    this.faqQueues[i].expanded = (this.faqQueues[i].expanded ? false : true);
    return this.faqQueues[i].expanded
  }

  expandGeneral(i) {
    this.faqGeneral[i].expanded = (this.faqGeneral[i].expanded ? false : true);
    return this.faqGeneral[i].expanded
  }

}
