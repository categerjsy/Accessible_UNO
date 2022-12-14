import { Component, OnInit,  Input, Output, EventEmitter,Renderer2} from '@angular/core';
import { SocketsService } from 'src/app/global/services/sockets/sockets.service';
import { GamesService } from 'src/app/global/services/games/game.service';
import { PlayerModel } from 'src/app/global/models/players/player.model';
import { GameModel } from 'src/app/global/models/games/game.model';
import { Router } from '@angular/router'; 
import { CardModel } from 'src/app/global/models/cards/card.model';
import { PlayersService } from 'src/app/global/services/players/players.service';

@Component({
  selector: 'app-tablegame',
  templateUrl: './tablegame.component.html',
  styleUrls: ['./tablegame.component.scss']
})
export class TableGameComponent implements OnInit {
  public game = new GameModel();
  public players : PlayerModel[] = [];
  //public players: string[] = [];
  public cardValue:any;

  constructor(
    private router: Router, 
    private socketService: SocketsService,
    private renderer: Renderer2,
    private gamesService: GamesService,
    private playersService: PlayersService) {
    this.renderer.setStyle(document.body, 'background-image', 'url(../../../assets/backgrounds/background.png)');
  }

  ngOnInit() {
    this.gamesService.getActive(true).subscribe((result:any) => {
      var current_game = result[0];
      if(JSON.stringify(current_game) === undefined ){
        console.log("No active Game")
      }else{
        this.game = current_game;
        var firstCard=current_game.cards_on_deck[0];
        var splitted = firstCard.split(" ", 2); 
        this.setCard(splitted[0],splitted[1]);
        setTimeout(() => {
          current_game.played_cards.push(firstCard);
          current_game.last_card = firstCard;
          current_game.cards_on_deck.shift();
          let newGame = this.game;
          this.gamesService.update(newGame).subscribe((result: any) => {});
        },1000);
      }
      this.removeCards(current_game);
    });
    
  }

  setCard(num: any,des: any,){
    this.cardValue={
      name:des,
      number:num
    }
  }

  removeCards(current_game: { players: any; }){
    var Players = this.game.players
    for (var player of Players) {
      this.playersService.getById(player).subscribe((result:any) => {
        this.players.push(result);
        result.cards_hand = [];
        this.playersService.update(result).subscribe((result: any) => {});
      });
    }
    console.log(this.players)
    setTimeout(() => {this.dealCards(current_game)},1000);
  }
  
  dealCards(current_game: { players: any; }){
    var players = this.game.players
    for (var player of players) {
      this.playersService.getById(player).subscribe((result:any) => {
        for(let i=0; i<7; i++){
          result.cards_hand.push(this.game.cards_on_deck[0])
          this.game.cards_on_deck.shift();
        }
        //console.log(result)
        this.gamesService.update(this.game).subscribe((result: any) => {});
        this.playersService.update(result).subscribe((result: any) => {});
      });
    }
  }

}
