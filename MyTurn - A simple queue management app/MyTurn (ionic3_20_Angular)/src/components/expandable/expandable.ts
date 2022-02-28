import { Component, Input, ViewChild, ElementRef, Renderer2 } from '@angular/core';
 
@Component({
  selector: 'expandable',
  templateUrl: 'expandable.html'
})
export class ExpandableComponent {
 
    @ViewChild('expandWrapper', {read: ElementRef}) expandWrapper;
    @Input('expanded') expanded;
    @Input('expandHeight') expandHeight;
 
    constructor(public renderer: Renderer2) {
 
    }
 
    ngAfterViewInit(){
        this.renderer.setStyle(this.expandWrapper.nativeElement, 'height', this.expandHeight + 'px'); //Renderer is deprecated so changed it to Renderer2 and used .setStyle instead of setElementStyle
        //Dynamic height below, bt animation will not work
        //this.renderer.setElementStyle(this.expandWrapper.nativeElement, 'height', 'auto');   
    }
 
}
