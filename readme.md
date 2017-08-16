# Dice

## API

```
- /
  - GET => serves the initial HTML
```

### TO-DO:
- map diceId to user when creating the dice
- create user profile page that shows the dice the users created
- add description processing to Dice data
- fix issue with history control of create dice page (disallow dice without options)
- add checking for title/description value before creating/editing dice
- add dice graphics + simple animation + pop-up element for rolling dice
- add simple explainer to site

## Improvements:
- abstract out class to interact with mongo database
- unit tests of all relevant functions
- abstract out to middleware for functions that check inputs
