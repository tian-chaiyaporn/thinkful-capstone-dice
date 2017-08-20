# Dice

## API

```
```

## TO-DO to complete MVP:
- create user profile page that shows the dice the users created
- add dice graphics + simple animation + pop-up element for rolling dice
- add simple explainer to site
- this can be used to redirect explainer page as well

## Improvements:
- abstract out class to interact with mongo database
- unit tests of all relevant functions (try TDD methods)
- abstract out to middleware for functions that check inputs
- prevent injection attack + get rid of spaces when checking inputs
- Include architecture diagram (MV* pattern) + rearrange some modules (NavigationViewConstruction should be decoupled from jquery) to comply with this architecture
- Rearrange files in /js into relevant 'components', e.g. /Buttons /components
- add feature for user to save other dice
- add feature for external api dice
