import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../navigation/sidebar/sidebar';

@Component({
  imports: [RouterOutlet, Sidebar],
  selector: 'app-wrapper',
  styleUrl: './wrapper.css',
  templateUrl: './wrapper.html',
})
export class Wrapper {}
