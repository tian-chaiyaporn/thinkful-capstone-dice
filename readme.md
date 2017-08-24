# Dice


## NOTE:
Please note that this project utilizes the Material Design lite css library by Google. However, there are some known bugs that may cause problems for cross-browser compatability:
https://github.com/google/material-design-lite#limited-support

## Improvements:
- abstract out class to interact with mongo database
- limit option input to 250 characters
- unit tests of all relevant functions (try TDD methods)
- abstract out to middleware for functions that check inputs
- prevent injection attack + get rid of spaces when checking inputs
- Include architecture diagram (MV* pattern) + rearrange some modules (NavigationViewConstruction should be decoupled from jquery) to comply with this architecture
- Rearrange files in /js into relevant 'components', e.g. /Buttons /components
- add feature for user to save other dice
- add feature for external api dice
- delete diceId from user list (only if database can't handle it, so user can restore dice if needed)
