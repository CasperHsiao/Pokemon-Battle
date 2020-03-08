/**
 * Casper Hsiao
 * 08.02.2019
 * CSE 154 AC
 * This is the pokemon.js page for my homework 3.
 * This page provides functionality to interact with the CSE 154 pokedex web
 * service and display the pokemon icons and founded pokemon data to the page.
 * Allows the player to choose a found pokemon and battle with random opponent
 * pokemons. Player would expand the found pokemons in the pokedex once they
 * have won a battle with the pokemon, and they would be able to choose them
 * for future battles.
 */
"use strict";
(function() {
  const BASE_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/";
  const FULL_HEALTH = 100;
  const LOW_HEALTH = 20;
  let ORIGINAL_HEALTH = 0;
  let GUID = "";
  let PID = "";
  window.addEventListener("load", init);

  /**
   * When the window loads, get all of the pokemon sprite icons and set the
   * default starter pokemon up to show their pokemon data when clicked.
   * Starts the pokemon battle with random opponent pokemon when the start
   * button is clicked. Allow player to flee the battle when the flee button
   * is clicked. Performs the moves of the pokemon when the move is clicked.
   */
  function init() {
    populateNames();
    id("start-btn").addEventListener("click", startGame);
    id("start-btn").addEventListener("click", initiatePlayers);
    let buttons = qsa("#p1 .moves button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", gamePlay);
    }
    id("flee-btn").addEventListener("click", gamePlay);
  }

  /**
   * Get all the pokemon names. Utilize it to append all the sprite icons.
   */
  function populateNames() {
    let url = BASE_URL + "pokedex.php?pokedex=all";
    fetch(url)
      .then(checkStatus)
      .then(response => response.text())
      .then(appendSprites)
      .catch(console.error);
  }

  /**
   * Appends all the pokemon sprite icons to the cotainer. Allow player to
   * start the game once a found pokemon is chosen.
   * @param {object} response - response to the JSON object.
   */
  function appendSprites(response) {
    let list = response.split("\n");
    for (let i = 0; i < list.length; i++) {
      let pokemon = list[i];
      let fullName = pokemon.split(":")[0];
      let shortName = pokemon.split(":")[1];
      let img = gen("img");
      if (fullName === "Bulbasaur" || fullName === "Charmander" || fullName === "Squirtle") {
        img.classList.add("found");
        let player = "#p1";
        img.addEventListener("click", function() {
          populateData(shortName, player);
          id("start-btn").classList.remove("hidden");
        });
      }
      img.classList.add("sprite");
      img.src = BASE_URL + "sprites/" + shortName + ".png";
      img.alt = shortName + "-sprite";
      id("pokedex-view").appendChild(img);
    }
  }

  /**
   * Get the pokemon data of the given pokemon and append it to
   * the player or opponent card.
   * @param {string} shortName - short name of the pokemon clicked.
   * @param {string} player - The id of the player or opponent card.
   */
  function populateData(shortName, player) {
    let url = BASE_URL + "pokedex.php?pokemon=" + shortName;
    fetch(url)
      .then(checkStatus)
      .then(response => response.json())
      .then(function(response) {
        appendParameters(response, player);
      })
      .catch(console.error);
  }

  /**
   * Appends the given pokemon data to the card.
   * @param {object} response - response to the JSON object.
   * @param {string} player - The id of the player card to append the data on.
   */
  function appendParameters(response, player) {
    qs(player + " .name").textContent = response.name;
    qs(player + " .pokepic").src = BASE_URL + response.images.photo;
    qs(player + " .type").src = BASE_URL + response.images.typeIcon;
    qs(player + " .weakness").src = BASE_URL + response.images.weaknessIcon;
    qs(player + " .hp").textContent = response.hp + "HP";
    qs(player + " .info").textContent = response.info.description;
    let movesF = response.moves;
    let buttons = qsa(player + " .moves button");
    let moves = qsa(player + " span.move");
    let imgs = qsa(player + " .moves img");
    let dp = qsa(player + " span.dp");
    for (let i = 0; i < movesF.length; i++) {
      buttons[i].classList.remove("hidden");
      moves[i].textContent = movesF[i].name;
      imgs[i].src = BASE_URL + "icons/" + movesF[i].type + ".jpg";
      dp[i].textContent = "";
      if (movesF[i].dp !== undefined) {
        dp[i].textContent = movesF[i].dp + " DP";
      }
    }
    for (let i = movesF.length; i < buttons.length; i++) {
      dp[i].textContent = "";
      buttons[i].classList.add("hidden");
    }
  }

  /**
   * Switch the pokedex view to game view, and enables the player's pokemon
   * moves button.
   */
  function startGame() {
    id("pokedex-view").classList.add("hidden");
    id("p2").classList.remove("hidden");
    qs("#p1 .hp-info").classList.remove("hidden");
    id("results-container").classList.remove("hidden");
    id("p1-turn-results").classList.remove("hidden");
    id("p2-turn-results").classList.remove("hidden");
    id("start-btn").classList.add("hidden");
    id("flee-btn").classList.remove("hidden");
    qs("#p1 .buffs").classList.remove("hidden");
    qs("#p2 .buffs").classList.remove("hidden");
    qs("h1").textContent = "Pokemon Battle Mode!";
    let buttons = qsa("#p1 .moves button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
  }

  /**
   * Initiate the player's pokemon and opponent pokemon in the game view,
   * and get the identification for the battle to start.
   */
  function initiatePlayers() {
    let pokemonName = qs("#p1 .name").textContent;
    let url = BASE_URL + "game.php";
    let params = new FormData();
    params.append("startgame", "true");
    params.append("mypokemon", pokemonName);
    fetch(url, {method: "POST", body: params})
      .then(checkStatus)
      .then(response => response.json())
      .then(function(response) {
        GUID = response.guid;
        PID = response.pid;
        ORIGINAL_HEALTH = response.p1.hp;
        let opponent = "#p2";
        populateData(response.p2.shortname, opponent);
      })
      .catch(console.error);
  }

  /**
   * Get the current game status of the pokemon battle. Updates the status
   * onto the cards and the results container. Ends the game when one of
   * the pokemons died or the player fled.
   */
  function gamePlay() {
    let move = this.firstElementChild;
    if (move === null) {
      move = "flee";
    } else {
      move = move.textContent.replace(/\s/g, '').toLowerCase();
    }
    id("loading").classList.remove("hidden");
    let url = BASE_URL + "game.php";
    let params = new FormData();
    params.append("movename", move);
    params.append("guid", GUID);
    params.append("pid", PID);
    fetch(url, {method: "POST", body: params})
      .then(checkStatus)
      .then(response => response.json())
      .then(updateGame)
      .catch(console.error);
  }

  /**
   * Appends the updated game results onto the results container in the
   * middle, and update the pokemons' health bars, health points and buff
   * status on the right of the cards. Also, ends the game when one of
   * the pokemons died or the player fled.
   * @param {object} response - response to the JSON object.
   */
  function updateGame(response) {
    id("loading").classList.add("hidden");
    let p1Result = id("p1-turn-results");
    let p2Result = id("p2-turn-results");
    p1Result.textContent = "";
    p2Result.textContent = "";
    p1Result.textContent = "Player 1 Played " + response.results["p1-move"] +
      " and " + response.results["p1-result"];
    p2Result.textContent = "Player 2 Played " + response.results["p2-move"] +
      " and " + response.results["p2-result"];
    if (response.results["p2-result"] === null) {
      p2Result.classList.add("hidden");
    }
    let p1HealthBar = qs("#p1 .health-bar");
    qs("#p1 .card .hp").textContent = response.p1["current-hp"] + "HP";
    let p1Health = parseInt(response.p1["current-hp"] / response.p1.hp * FULL_HEALTH);
    p1HealthBar.style.width = p1Health + "%";
    if (p1Health < LOW_HEALTH) {
      p1HealthBar.classList.add("low-health");
    }
    let p2HealthBar = qs("#p2 .health-bar");
    qs("#p2 .card .hp").textContent = response.p2["current-hp"] + "HP";
    let p2Health = parseInt(response.p2["current-hp"] / response.p2.hp * FULL_HEALTH);
    p2HealthBar.style.width = p2Health + "%";
    if (p2Health < LOW_HEALTH) {
      p2HealthBar.classList.add("low-health");
    }
    updateBuffs(response);
    if (p1Health === 0 || p2Health === 0) {
      let game = true;
      if (p2Health !== 0) {
        game = false;
      }
      endGame(game, response.p2.shortname);
    }
  }

  /**
   * Appends the updated buff status of the pokemons to the right of the
   * cards.
   * @param {object} response - response to the JSON object.
   */
  function updateBuffs(response) {
    let p1Buffs = qs("#p1 .buffs");
    while (p1Buffs.firstChild !== null) {
      p1Buffs.removeChild(p1Buffs.firstChild);
    }
    let p1Buff = response.p1.buffs;
    for (let i = 0; i < p1Buff.length; i++) {
      let buff = gen("div");
      buff.classList.add("buff");
      buff.classList.add(p1Buff[i]);
      p1Buffs.appendChild(buff);
    }
    let p1Debuff = response.p1.debuffs;
    for (let i = 0; i < p1Debuff.length; i++) {
      let debuff = gen("div");
      debuff.classList.add("buff");
      debuff.classList.add(p1Debuff[i]);
      p1Buffs.appendChild(debuff);
    }
    let p2Buffs = qs("#p2 .buffs");
    while (p2Buffs.firstChild !== null) {
      p2Buffs.removeChild(p2Buffs.firstChild);
    }
    let p2Buff = response.p2.buffs;
    for (let i = 0; i < p2Buff.length; i++) {
      let buff = gen("div");
      buff.classList.add("buff");
      buff.classList.add(p2Buff[i]);
      p2Buffs.appendChild(buff);
    }
    let p2Debuff = response.p2.debuffs;
    for (let i = 0; i < p2Debuff.length; i++) {
      let debuff = gen("div");
      debuff.classList.add("buff");
      debuff.classList.add(p2Debuff[i]);
      p2Buffs.appendChild(debuff);
    }
  }

  /**
   * Ends the game of the pokemon battle. Displays the final result if the
   * player has won or loss the game. Disables all the pokemon move buttons.
   * If the player has won, add the opponent pokemon to the found pokemons.
   * @param {boolean} game - True if the player has won. Otherwise, false.
   * @param {string} opponentPokemon - Name of the opponent pokemon.
   */
  function endGame(game, opponentPokemon) {
    if (game) {
      qs("h1").textContent = "You Won!";
      let pokemonSprites = id("pokedex-view").children;
      for (let i = 0; i < pokemonSprites.length; i++) {
        if (pokemonSprites[i].alt === opponentPokemon + "-sprite") {
          pokemonSprites[i].classList.add("found");
          let player = "#p1";
          pokemonSprites[i].addEventListener("click", function() {
            populateData(opponentPokemon, player);
          });
        }
      }
    } else {
      qs("h1").textContent = "You Lost!";
    }
    id("endgame").classList.remove("hidden");
    id("flee-btn").classList.add("hidden");
    let buttons = qsa("#p1 .moves button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
    }
    id("endgame").addEventListener("click", backToPokedex);
  }

  /**
   * Returns the game view back to the pokedex view. Reset the player's
   * pokemon back to the original status.
   */
  function backToPokedex() {
    id("endgame").classList.add("hidden");
    id("pokedex-view").classList.remove("hidden");
    id("p2").classList.add("hidden");
    qs("#p1 .hp-info").classList.add("hidden");
    id("results-container").classList.add("hidden");
    id("start-btn").classList.remove("hidden");
    qs(".buffs").classList.add("hidden");
    qs("h1").textContent = "Your Pokedex";
    qs("#p1 .card .hp").textContent = ORIGINAL_HEALTH + "HP";
    let p1HealthBar = qs("#p1 .health-bar");
    p1HealthBar.style.width = "100%";
    p1HealthBar.classList.remove("low-health");
    let p2HealthBar = qs("#p2 .health-bar");
    p2HealthBar.style.width = "100%";
    p2HealthBar.classList.remove("low-health");
    id("p1-turn-results").textContent = "";
    id("p2-turn-results").textContent = "";
    let p1Buffs = qs("#p1 .buffs");
    let p2Buffs = qs("#p2 .buffs");
    while (p1Buffs.firstChild !== null) {
      p1Buffs.removeChild(p1Buffs.firstChild);
    }
    while (p2Buffs.firstChild !== null) {
      p2Buffs.removeChild(p2Buffs.firstChild);
    }

  }

  /**
   * Helper function to return the response's result text if successful,
   * otherwise returns the rejected Promise result with an error status and
   * corresponding text.
   * @param {object} response - response to check for success/error.
   * @return {object} - valid response if response was successful, otherwise
   *                    rejected Promise result.
   */
  function checkStatus(response) {
    if (!response.ok) {
      throw Error("Error in request: " + response.statusText);
    }
    return response;
  }

  /**
   * Returns the first element of the given selector.
   * @param {string} selector - Takes the CSS selector.
   * @return {DOMObject} Returns the required element.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns all the elements of the given selector.
   * @param {string} selector - Takes the CSS selector.
   * @return {DOMList} Returns an array of required elements.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} id - element ID.
   * @return {object} DOM object associated with id.
   */
  function id(id) {
    return document.getElementById(id);
  }

  /**
   * Returns a new DOM element with the given tag name (if one exists). If el is not
   * a correct tag name, returns undefined.
   * @param {string} el - tag name.
   * @return {object} newly-created DOM object of given tag type.
   */
  function gen(el) {
    return document.createElement(el);
  }
})();
