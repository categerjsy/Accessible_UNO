import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Accessible UNO';
  // selected=false;
  // clicked(){
  //   this.selected=!this.selected;
  // }
  constructor(public router: Router) {
    console.log(this.router.url)
  }
}
