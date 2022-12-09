import { Component, OnInit, Renderer2} from '@angular/core';
import { Router } from '@angular/router'; 
import { PlayerModel } from 'src/app/global/models/players/player.model';
import { SocketsService } from 'src/app/global/services/sockets/sockets.service';
import { PlayersService } from 'src/app/global/services/players/players.service';
import { GamesService } from 'src/app/global/services/games/game.service';

import Swal from 'sweetalert2';
@Component({
  selector: 'app-home',
  templateUrl: './phone.component.html',
  styleUrls: ['./phone.component.scss']
})
export class PhoneComponent implements OnInit {
  sign=false
  main=false
  hourglass=false
  hided=false
  signup=false
  isSigned=false
  join=false;

  public player: PlayerModel[] = [];
  public username: string = '';
  public password: string = '';
  public cpassword: string = '';
  public avatar: string = '';
  public wins: number = 0;
  public games: number = 0;
  public dysrhythmia: boolean  = false;
  public dyslexia: boolean = false;
  public impairedVision: boolean = false;
  public unos:number=0;
  public wild_cards:number=0;
  public score: number=0;
  public cards_hand:string[]=[];

  constructor(
    private router: Router,
    private playersService: PlayersService,
    private socketService: SocketsService,
    private renderer: Renderer2,
    private gamesService: GamesService
  ) {
    this.renderer.setStyle(document.body, 'background-image', 'url(../../../assets/backgrounds/background.png)');
  }

  ngOnInit() { }
 
  public postPlayer(): void {
    // Emit event for update tasks
    const player = new PlayerModel();
    player.username = this.username;
    player.password = this.password;
    player.avatar = this.avatar;
    player.wins = this.wins;
    player.games = this.games;
    player.dysrhythmia = this.dysrhythmia;
    player.dyslexia = this.dyslexia;
    player.impairedVision = this.impairedVision;
    player.unos=this.unos;
    player.wild_cards=this.wild_cards;
    player.score=this.score;
    player.cards_hand=this.cards_hand;

    this.playersService.create(player).subscribe((result) => {
      this.username = '';
      this.password = '';
      this.avatar = '';
      this.wins = 0;
      this.games = 0;
      this.dysrhythmia = false;
      this.dyslexia = false;
      this.impairedVision = false;

      this.socketService.publish("players_create", player);
    });
  }


  public signinPlayer():void {
    const player = new PlayerModel();
    player.username = this.username;
    player.password = this.password;
    this.playersService.getByUsername(this.username, this.password).subscribe((result) => {
      var current_player = result[0];
      //console.log(result[0].password, typeof(result));
      this.socketService.publish("players_signin", player);
      console.log(current_player.username)
      if(JSON.stringify(current_player) === "{}"){
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Wrong username or password!',
        })
      } else{
        this.signInB();
      }
    });
  }

  signIn(){
    this.sign=true
    this.signup=false
  }

  signUp(){
    this.signup=true
    this.sign=true
  }

  signInB(){
    this.sign=false
    this.isSigned=true
    this.main=true

    this.socketService.subscribe("games_create", (data: any) => {
      this.joinGame();
    });
    this.gamesService.getActive(true).subscribe((result) => {
      var current_game = result;
      console.log(JSON.stringify(current_game));
      if(JSON.stringify(current_game) === "[]"){
        console.log("empty")
      }else{
        this.joinGame();
      }
    });
  }

  joinGame(){
    this.join=true;
  }

 signUpB(){
  Swal.fire('Your account is ready!', 'Sign in to start playing!', 'info')
  this.sign=true
  this.signup=false
 }
  startGame(){
    this.main=false
    this.hourglass=true
    setTimeout(() => this.changePage(), 5000);  //60s
  }

  changePage(){
    this.router.navigate(['/phonegame']);
  }

  getClickAction(_event: any) {
    // console.log(_event);
    this.hided = _event;
    if(_event) {
      this.renderer.setStyle(document.body, 'background', 'whitesmoke');

    }
    else {
      this.renderer.setStyle(document.body, 'background-image', 'url(../../../assets/backgrounds/background.png)');
    }
  }

 
 

}
