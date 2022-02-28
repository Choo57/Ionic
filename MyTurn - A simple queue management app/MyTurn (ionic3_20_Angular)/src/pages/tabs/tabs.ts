import { AdminPage } from './../admin/admin';
import { QueuesPage } from './../queues/queues';
import { Component } from '@angular/core';
import { HomePage } from '../home/home';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = HomePage;
  tab2Root = AdminPage;
  tab3Root = QueuesPage;

  constructor() {

  }
}
