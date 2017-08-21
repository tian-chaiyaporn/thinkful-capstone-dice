# Dice

## API

```
```

## TO-DO to complete MVP:
Create edit dice button component with html
1.1 the edit dice button would only call diceEditViewConstructor if it is verified

Check edit by passing user_id to api and check against session and return binary for confirmation

Only show edit button if the dice was created by the user
3.1 when constructing the DicePageViewConstructor, import userState and check if user has a dice that correspond with the dice_id. If yes, shows the dice edit button

- only user can edit certain dice; abstract out dice-edit button, and see if user id and dice id are the same or not.

- add dice graphics + simple animation + pop-up element for rolling dice

- add simple explainer to site with redirect function

## Improvements:
- abstract out class to interact with mongo database
- unit tests of all relevant functions (try TDD methods)
- abstract out to middleware for functions that check inputs
- prevent injection attack + get rid of spaces when checking inputs
- Include architecture diagram (MV* pattern) + rearrange some modules (NavigationViewConstruction should be decoupled from jquery) to comply with this architecture
- Rearrange files in /js into relevant 'components', e.g. /Buttons /components
- add feature for user to save other dice
- add feature for external api dice
