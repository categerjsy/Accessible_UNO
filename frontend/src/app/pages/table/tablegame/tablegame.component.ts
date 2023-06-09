import { Component, OnInit, Renderer2, } from '@angular/core';
import { SocketsService } from 'src/app/global/services/sockets/sockets.service';
import { GamesService } from 'src/app/global/services/games/game.service';
import { PlayerModel } from 'src/app/global/models/players/player.model';
import { GameModel } from 'src/app/global/models/games/game.model';
import { Router } from '@angular/router';
import { PlayersService } from 'src/app/global/services/players/players.service';
import { SmartSpeakerService } from 'src/app/global/services/smart-speaker/smart-speaker.service';
import arrayShuffle from 'array-shuffle';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tablegame',
  templateUrl: './tablegame.component.html',
  styleUrls: ['./tablegame.component.scss'],
})

export class TableGameComponent implements OnInit {
  public game = new GameModel();
  public players: PlayerModel[] = [];
  public cardValue: any;
  public cards: string[] = [];
  public turn: string = '';
  public length = 0;
  public number_of_cards = [0, 0, 0, 0];
  public turns_of_players = -1;
  public reverse = false;
  public card_type = 'normal';
  public uno_player = '';
  public wait_uno = false;
  public end_of_round = false;
  public points_round = 0;
  public winner_id = '';
  public winner_username = '';
  public player_throw_card = '';
  public fontClass: string = 'font';
  public impVision: boolean = false;
  constructor(
    private router: Router,
    private socketService: SocketsService,
    private renderer: Renderer2,
    private gamesService: GamesService,
    private playersService: PlayersService,
    private smartSpeaker: SmartSpeakerService,
  ) {
    this.renderer.setStyle(
      document.body, 'background-image', 'url(../../../assets/backgrounds/background.png)');
  }

  ngOnInit() {
    this.smartSpeaker.addCommand('uno', () => {
      console.log("UNO Command")
      if (this.wait_uno === true) {
        this.socketService.publish('says_uno', this.uno_player); //id
      }
    });
    this.smartSpeaker.addCommand(['pass', 'bus'], () => {
      console.log("PASS Command")
      this.socketService.publish('says_pass', this.turn); //id
    });
    this.smartSpeaker.addCommand(['draw','draw card'], () => {
      console.log("DRAW Command")
      this.socketService.publish('says_draw', this.turn); //id
    });
    this.smartSpeaker.addCommand(['throw','throw this card'], () => {
      console.log("THROW Command")
      this.socketService.publish('says_throw', this.turn); //id
    });
    this.smartSpeaker.initialize();
    this.smartSpeaker.start();

    this.gamesService.getActive(true).subscribe((result: any) => {
      if (JSON.stringify(result[0]) === undefined) {
        console.log('No active Game');
      } else {
        this.game = result[0];
        this.socketService.publish('new_game', this.game);
        console.log(this.game.players)
        this.zeroPoints(this.game);
        setTimeout(() => {
          if (this.game.colorblindness == true) {
            this.card_type = 'other';
          }
          if (this.game.dyslexia == true) {
            this.fontClass = 'open-dyslexic';
          }
          if (this.game.impairedVision == true) {
            this.smartSpeaker.speak('The game is about to start.');
            this.impVision = true;
          }
          this.card_type;
          this.length = this.game.players.length;

          let check;
          let firstCard;
          do {
            firstCard = this.game.cards_on_deck[0];
            check = ((firstCard === "WildCard All.png") || (firstCard === "+4 All.png") || (firstCard === "+2 Blue.png") || (firstCard === "+2 Red.png") || (firstCard === "+2 Green.png") || (firstCard === "+2 Yellow.png"));

            if (check) {
              //console.log(this.game.cards_on_deck)
              this.game.cards_on_deck.shift();
              this.game.cards_on_deck.push(firstCard)
              //console.log(this.game.cards_on_deck)
              firstCard = this.game.cards_on_deck[0];
            }
          } while (check);
          //console.log(firstCard)
          this.playedCard(firstCard);
          //this.removeCards(this.game); //old
          setTimeout(() => { this.removeCards(this.game); }, 1000); //old cards of players
          // 
        }, 1000);

      }
    });

    this.socketService.subscribe('card_played', (data: any) => {
      console.log('Player Played a Card');
      this.player_throw_card = data.player._id;
      //Penalty
      //console.log("data player id" + data.id)
      //console.log("uno_p" + this.uno_player)
      if ((this.wait_uno === true) && (data.id != this.uno_player)) {
        console.log("Player " + this.uno_player + " got penalty from not saying UNO");
        if (this.impVision) {
          this.smartSpeaker.speak(data.username + " got a penalty from not saying UNO");
        }

        this.socketService.publish('penalty', this.uno_player);
        this.wait_uno = false;
      }
      this.playedCard(data.card);
      this.updatePlayer(data.player);
      this.setTurn(true);
    });

    this.socketService.subscribe('draw_card', (data: any) => {
      console.log('Player Drew a Card');
      if (this.impVision) {
        if (data.number_of_cards === 1) {
          this.smartSpeaker.speak(data.player.username + " a drew a card");
        } else {
          console.log(data.player.username + " took " + data.number_of_cards + " cards")
          this.smartSpeaker.speak(data.player.username + " took " + data.number_of_cards + " cards");
        }
      }
      this.updatePlayer(data.player);
      this.updateGame();
    });

    this.socketService.subscribe('player_passed', (data: PlayerModel) => {
      console.log('Player Passed');
      if (this.impVision) {
        this.smartSpeaker.speak(data.username + " passed");
      }
      this.setTurn(true);
    });

    this.socketService.subscribe('uno_player', (data: PlayerModel) => {
      if (this.wait_uno == true) {
        data.unos++;
        this.playersService.update(data).subscribe((result: any) => {
          this.socketService.publish('phone_player_update', data)
        });
        console.log("Player " + data.username + " says UNO");
        this.socketService.publish('wall_update', data);
        if (this.impVision) {
          this.smartSpeaker.speak(data.username + " said UNO");
        }
        this.uno_player = '';
        this.wait_uno = false;
      }
    });

    this.socketService.subscribe('one_card', (data: any) => {
      console.log('Waiting UNO from player:' + data);
      this.uno_player = data;
      this.wait_uno = true;
    });

    this.socketService.subscribe('won_round', (data: PlayerModel) => {
      console.log('Player ' + data._id + ' won the round');
      this.winner_id = data._id;
      this.endRound();
      this.turns_of_players = this.game.players.indexOf(data._id);
      if (this.impVision) {
        this.smartSpeaker.speak(data.username + " won the round");
      }

      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i]._id === this.winner_id) {
          this.winner_username = this.players[i].username;
        }
      }

      Swal.fire({
        title: 'Round has ended!',
        html: this.winner_username + ' won this round.',
        imageUrl: 'https://cdn.dribbble.com/users/100757/screenshots/1912706/media/db8f55111c06444b63f1e99746d11c4b.gif',
        imageWidth: 500,
        imageHeight: 300,
        imageAlt: 'Custom image',
        timer: 30000,
        showConfirmButton: false,
      }).then(() => {

      });

    });

    this.socketService.subscribe('start_round', (id: any) => {
      console.log('Player with id=' + id + 'clicked start round');
      if (this.end_of_round === true)
        this.startRound();
    });

    this.socketService.subscribe('win', (data: any) => {
      this.game.active = false;
      this.gamesService.update(this.game).subscribe((result: any) => {
        if (this.impVision) {
          this.smartSpeaker.speak(data.username + " won the game");
        }

        Swal.fire({
          title: 'End of the game...!',
          html: data.username + ' won this game.',
          imageUrl: 'https://media.istockphoto.com/id/1315398548/vector/winner-concept-trophy-cup-illustration.jpg?s=612x612&w=0&k=20&c=KDhA6vyqrvtSNv4PAkRUKUm0cOnd38TaBSpVwQIgeOw=',
          imageWidth: 500,
          imageHeight: 300,
          imageAlt: 'Custom image',
          timer: 30000,
          showConfirmButton: false,
        }).then(() => {
          setTimeout(() => { this.router.navigate(['/table']); }, 1000);
        });

      });
    });

    this.socketService.subscribe('error_pass', (msg: string) => {
      console.log(msg);
      this.smartSpeaker.speak(msg);
    })
  }

  setTurn(bool: boolean) {
    let username = "";
    if (this.end_of_round === false) {
      if (!this.reverse) {
        if (this.turn === '' || this.turn === this.game.players[this.game.players.length - 1]) {
          this.turn = this.game.players[0];
          this.turns_of_players = 0;
        } else {
          this.turn = this.game.players[this.game.players.indexOf(this.turn) + 1];
          this.turns_of_players++;
        }
      } else {
        if (this.turn === '' || this.turn === this.game.players[0]) {
          this.turn = this.game.players[this.game.players.length - 1];
          this.turns_of_players = this.game.players.length - 1;
        } else {
          this.turn = this.game.players[this.game.players.indexOf(this.turn) - 1];
          this.turns_of_players--;
        }
      }
      this.socketService.publish('turn', this.turn);
      let pTurn = this.players[this.turns_of_players];
      this.socketService.publish("turnPlayer", pTurn);
      if (bool === true) {
        username = this.players[this.turns_of_players].username;
        console.log("Current turn: " + username)
        if (this.impVision) {
          this.smartSpeaker.speak("It's " + username + "'s turn to play.");
        }
      }
      //console.log('Turn: ' + this.turn);
      //console.log('turns_of_players=' + this.turns_of_players);
      this.game.turn = this.turn;
      let newGame = this.game;
      this.gamesService.update(newGame).subscribe((result: any) => { });
    }
  }

  playedCard(card: any) {
    this.cards[0] = card;
    var splitted = card.split(' ', 2);
    this.setCard(splitted[0], splitted[1], this.game.dysrhythmia, this.game.colorblindness, this.game.dyslexia);

    if (splitted[0] === '+2') {
      console.log('+2');
      this.setTurn(false);
      this.socketService.publish('drawTwo', this.turn);
    } else if (splitted[0] === '+4') {
      console.log('+4');
      this.played_wild_card(this.player_throw_card);
      this.setTurn(false);
      this.socketService.publish('drawFour', this.turn);
    } else if (splitted[0] === 'Skip') {
      this.setTurn(false);
    } else if (splitted[0] === 'Reverse') {
      if (this.length === 2)
        this.setTurn(false);
      if (this.reverse == false)
        this.reverse = true;
      else
        this.reverse = false;
    } else if (splitted[0] === "WildCard") {
      this.played_wild_card(this.player_throw_card);
    }

    setTimeout(() => {
      this.game.played_cards.push(card);
      this.game.last_card = card;
      this.game.cards_on_deck.shift();
      let newGame = this.game;
      this.gamesService.update(newGame).subscribe((result: any) => { });
    }, 1000);
  }

  setCard(num: any, des: any, dyshr: boolean, clrblind: boolean, dys: boolean) {
    this.cardValue = {
      color: des,
      number: num,
      dysrhythmia: dyshr,
      colorblindness: clrblind,
      dyslexia: dys
    };
    this.socketService.publish('card_table', this.cardValue);
    if (this.impVision) {
      this.smartSpeaker.speak('The card on the table is' + this.cardValue.number + ' ' + this.cardValue.color.slice(0, -4));
    }
  }

  removeCards(current_game: { players: any }) {
    //this.socketService.publish('new_start', this.game.players);
    let players = this.game.players;
    const delay = (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms)); //new
    (async () => { //new
      for (let player of players) {
        await delay(Math.random() * 1000); //new
        this.playersService.getById(player).subscribe((plr: PlayerModel) => {
          plr.cards_hand = [];
          this.players.push(plr);
          //this.socketService.publish('start_game', plr);
          this.playersService.update(plr).subscribe((result: any) => {
            console.log('In remove cards:')
            console.log(result);
            this.dealCards(result);
          });
        });
      }
    })(); //new
    console.log('The players of the game:');
    console.log(this.players);
    setTimeout(() => { //new
      //this.dealCardsOriginal(current_game); //old
      this.number_of_cards = [7, 7, 7, 7];
      this.setTurn(true);
    }, 3000); //new
  }

  dealCards(plr: PlayerModel) {
    for (let i = 0; i < 7; i++) {
      plr.cards_hand.push(this.game.cards_on_deck[0]);
      this.game.cards_on_deck.shift();
    }
    this.gamesService.update(this.game).subscribe((result: any) => { });
    this.playersService.update(plr).subscribe((result: any) => {
      this.socketService.publish("cards_ready", plr);
    });
    // this.number_of_cards = [7, 7, 7, 7];
    // this.setTurn(true);
  }

  // dealCardsOriginal(current_game: { players: any }) {
  //   let players = this.game.players;
  //   for (let player of players) {
  //     this.playersService.getById(player).subscribe((plr: any) => {
  //       for (let i = 0; i < 7; i++) {
  //         plr.cards_hand.push(this.game.cards_on_deck[0]);
  //         this.game.cards_on_deck.shift();
  //       }
  //       this.gamesService.update(this.game).subscribe((result: any) => { });
  //       this.playersService.update(plr).subscribe((result: any) => { });
  //     });
  //   }
  //   this.number_of_cards = [7, 7, 7, 7];
  //   this.setTurn(true);
  // }

  updatePlayer(data: PlayerModel) {
    let i = 0;
    for (let player of this.players) {
      if (player._id === data._id) {
        this.players[i] = data;
        this.number_of_cards[i] = data.cards_hand.length;
        console.log('Player updated:');
        console.log(player)
      }
      i++;
    }
    //console.log(this.players)
  }

  updateGame() {
    this.gamesService.getActive(true).subscribe((result: any) => {
      if (JSON.stringify(result[0]) === undefined) {
        console.log('No active Game');
      } else {
        this.game = result[0];
        console.log('Game updated');
        //console.log(this.game);
      }
    });
  }

  endRound() {
    this.calculatePoints(this.game)
    this.end_of_round = true;
    //this.players = [];
    this.cards = [];
    this.turn = '';
    this.turns_of_players = -1;
    this.reverse = false;
    this.uno_player = '';
    this.wait_uno = false;
    this.player_throw_card = '';
    this.game.active = false;
    this.gamesService.update(this.game).subscribe((result: any) => { });
  }

  zeroPoints(current_game: { players: any }) {
    //zero Scores of players
    let players = this.game.players;
    for (let player of players) {
      this.playersService.getById(player).subscribe((plr: PlayerModel) => {
        let p = plr;
        p.score = 0;
        p.unos = 0;
        p.wild_cards = 0;
        p.games++;
        this.socketService.publish('start_game', p);
        this.playersService.update(p).subscribe((result: any) => { });
      })
    }
  }

  calculatePoints(current_game: { players: any }) {
    let players = this.game.players;
    for (let player of players) {
      this.playersService.getById(player).subscribe((plr: PlayerModel) => {
        let p_cards = plr.cards_hand;
        for (let i = 0; i < p_cards.length; i++) {
          var splitted = p_cards[i].split(' ', 2);
          switch (splitted[0]) {
            case "0": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "1": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "2": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "3": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "4": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "5": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "6": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "7": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "8": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "9": {
              this.points_round = this.points_round + parseInt(splitted[0])
              break;
            }
            case "+2": {
              this.points_round = this.points_round + 20
              break;
            }
            case "Skip": {
              this.points_round = this.points_round + 20
              break;
            }
            case "Reverse": {
              this.points_round = this.points_round + 20
              break;
            }
            case "WildCard": {
              this.points_round = this.points_round + 50
              break;
            }
            case "+4": {
              this.points_round = this.points_round + 50
              break;
            }
            default: {
              //statements; 
              break;
            }
          }
        }
        //afou exw to id tou winner prepei na steilw stin basi to score tou 
        //kai sto wall 
        // episis logika prepei na mpei elegxos oti einai 0 to score tou prin ? 
        //i na ta midenizoume sto wall eksarxis
        for (let player of players) {
          this.playersService.getById(player).subscribe((plr: PlayerModel) => {
            let p = plr;
            if (p._id === this.winner_id) {
              p.score = p.score + this.points_round;
              this.playersService.update(p).subscribe((result: any) => { });
              //this.socketService.publish('new_start', plr);
              this.socketService.publish('wall_update', plr);
            }
          })
        }
        // for (let player of players) {
        //   this.playersService.getById(player).subscribe((plr: PlayerModel) => {
        //     //this.socketService.publish('start_game', plr);
        //   })
        // }

      });
    }


  }

  startRound() {
    this.end_of_round = false;
    if (this.impVision) {
      this.smartSpeaker.speak('The round is about to start.');
    }
    this.initRound();
  }

  initRound() {
    this.game.active = true;
    this.game.cards_on_deck = arrayShuffle([
      '0 Red.png',
      '0 Yellow.png',
      '0 Green.png',
      '0 Blue.png',
      '1 Red.png',
      '1 Yellow.png',
      '1 Green.png',
      '1 Blue.png',
      '1 Red.png',
      '1 Yellow.png',
      '1 Green.png',
      '1 Blue.png',
      '2 Red.png',
      '2 Yellow.png',
      '2 Green.png',
      '2 Blue.png',
      '2 Red.png',
      '2 Yellow.png',
      '2 Green.png',
      '2 Blue.png',
      '3 Red.png',
      '3 Yellow.png',
      '3 Green.png',
      '3 Blue.png',
      '3 Red.png',
      '3 Yellow.png',
      '3 Green.png',
      '3 Blue.png',
      '4 Red.png',
      '4 Yellow.png',
      '4 Green.png',
      '4 Blue.png',
      '4 Red.png',
      '4 Yellow.png',
      '4 Green.png',
      '4 Blue.png',
      '5 Red.png',
      '5 Yellow.png',
      '5 Green.png',
      '5 Blue.png',
      '5 Red.png',
      '5 Yellow.png',
      '5 Green.png',
      '5 Blue.png',
      '6 Red.png',
      '6 Yellow.png',
      '6 Green.png',
      '6 Blue.png',
      '6 Red.png',
      '6 Yellow.png',
      '6 Green.png',
      '6 Blue.png',
      '7 Red.png',
      '7 Yellow.png',
      '7 Green.png',
      '7 Blue.png',
      '7 Red.png',
      '7 Yellow.png',
      '7 Green.png',
      '7 Blue.png',
      '8 Red.png',
      '8 Yellow.png',
      '8 Green.png',
      '8 Blue.png',
      '8 Red.png',
      '8 Yellow.png',
      '8 Green.png',
      '8 Blue.png',
      '9 Red.png',
      '9 Yellow.png',
      '9 Green.png',
      '9 Blue.png',
      '9 Red.png',
      '9 Yellow.png',
      '9 Green.png',
      '9 Blue.png',
      'Reverse Red.png',
      'Reverse Yellow.png',
      'Reverse Green.png',
      'Reverse Blue.png',
      'Reverse Red.png',
      'Reverse Yellow.png',
      'Reverse Green.png',
      'Reverse Blue.png',
      'Skip Red.png',
      'Skip Yellow.png',
      'Skip Green.png',
      'Skip Blue.png',
      'Skip Red.png',
      'Skip Yellow.png',
      'Skip Green.png',
      'Skip Blue.png',
      '+2 Red.png',
      '+2 Yellow.png',
      '+2 Green.png',
      '+2 Blue.png',
      '+2 Red.png',
      '+2 Yellow.png',
      '+2 Green.png',
      '+2 Blue.png',
      'WildCard All.png',
      'WildCard All.png',
      'WildCard All.png',
      'WildCard All.png',
      '+4 All.png',
      '+4 All.png',
      '+4 All.png',
      '+4 All.png',
    ]);
    this.game.played_cards = [];
    this.game.turn = '';
    this.game.last_card = '';
    this.game.current_player = '';
    this.gamesService.update(this.game).subscribe((result: any) => {
      this.players = [];
      let check;
      let firstCard;
      do {
        firstCard = this.game.cards_on_deck[0];
        check = ((firstCard === "WildCard All.png") || (firstCard === "+4 All.png") || (firstCard === "+2 Blue.png") || (firstCard === "+2 Red.png") || (firstCard === "+2 Green.png") || (firstCard === "+2 Yellow.png"));

        if (check) {
          console.log(this.game.cards_on_deck)
          this.game.cards_on_deck.shift();
          // this.game.cards_on_deck.push(firstCard)
          console.log(this.game.cards_on_deck)
          firstCard = this.game.cards_on_deck[0];
        }
      } while (check);
      console.log('First card on table: ' + firstCard)

      this.playedCard(firstCard);
      //this.removeCards(this.game); //old cards of players
      setTimeout(() => { this.removeCards(this.game); }, 1000);
    });
  }

  played_wild_card(plr_id: string) {
    if (plr_id != '') {
      this.playersService.getById(plr_id).subscribe((plr: PlayerModel) => {
        plr.wild_cards++;
        this.playersService.update(plr).subscribe((result: any) => {
          this.socketService.publish('wall_update', plr);
          this.socketService.publish('phone_player_update', plr)
        });
      });
    }
  }

}
