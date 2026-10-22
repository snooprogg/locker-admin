import { Component } from '@angular/core';
import { Header } from '../navigation/header/header';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../navigation/sidebar/sidebar';

@Component({
  imports: [RouterOutlet, Sidebar, Header],
  selector: 'app-wrapper',
  styleUrl: './wrapper.css',
  templateUrl: './wrapper.html',
  host: { class: 'block h-full' },
})
export class Wrapper {}
