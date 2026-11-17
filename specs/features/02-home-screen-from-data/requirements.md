# Feature 2: Home screen and boards from data. Requirements

## What the feature must do

1. The home screen is a small grid of large cells. Source: PRODUCT.md, Capabilities. roadmap.md, feature 2.
2. Each cell carries a colour, a label and an icon. Source: PRODUCT.md, Capabilities.
3. The boards and the cells come from `boards.json` and `cells.json`. Source: PRODUCT.md, Capabilities. tech-stack.md, Data. CLAUDE.md, Rules.
4. A cell on the home screen opens a board. The first boards are Needs, Quick phrases and My boards. Source: roadmap.md, feature 2.
5. The boards use the Mulberry symbols. The app ships the licence credit with the symbol files, and the files are not changed. Source: PRODUCT.md, Capabilities. tech-stack.md, Design reference.
6. Every target for the primary user can be reached by a switch user, and the order of the targets in the page matches the order on screen. Scanning itself is feature 4. Source: PRODUCT.md, Principle 2. tech-stack.md, Tests.
7. The user can leave a board alone. Source: PRODUCT.md, Principle 1.
8. The settings button stays a caregiver control that scanning skips. Source: PRODUCT.md, Principle 2.
9. One gap size is used across a screen. Source: tech-stack.md, Design reference.
10. Home cells use the look of `context/design/home.html`. Board cells use the layout of `context/design/mockups/needs/needs-blue.html`, with the symbol above the label on a white cell. People who ask for less transparency get solid cells with no blur. Source: the two mockups. Feature 1, requirement 18.
11. Each screen passes WCAG 2.2 Level AA in every theme, fills the window and does not scroll. Source: PRODUCT.md, Accessibility and Inclusion. Feature 1, requirement 7.
12. The interface and the phrases are in English. Source: PRODUCT.md, Speech output.

## Decided by the user on 2026-11-16

13. A screen has two layouts. In the columns layout each group of cells is a column, read top to bottom. In the rows layout each group is a row, read left to right. A stored setting picks the layout, and columns are used when nothing is stored. This changes the rule in tech-stack.md and CLAUDE.md that scan order runs by row.
14. Feature 2 reads the stored layout and shows no picker. Feature 8 adds the picker.
15. The home screen draws four cells: My boards, Needs, Quick phrases and Keyboards. Devices, Messaging, Music, Photos, Video and Games are left out until their own features.
16. `cells.json` holds a list of tiles, and `boards.json` holds a list of boards. A board has an `id` and a list of `groups`. A group has a list of `cells`. A cell names a `tile` and can give a `size`. A size is `small`, `medium` or `large`, or a whole number of parts.
17. The goal is a dynamic grid that flexes with the tiles. The groups fill the main area equally, and the cells of a group fill it equally unless the data gives a size. A large cell takes 5 parts, a medium cell takes 4 and a small cell takes 3. A size given as a number is that many parts, so the names and the numbers are one scale. A cell with no size counts as medium when other cells in its group have a size.
18. A board can hold any number of groups, and a group can hold any number of cells. Keeping the cells few and large, as Principle 3 asks, is up to the person who writes the data.
19. A board with no groups and a group with no cells are both allowed, and they are drawn empty. Feature 9 puts an Add button in the empty place. That button is a caregiver control, so scanning skips it.
20. Communication boards are part of this feature. Feature 6 is removed from the roadmap.
21. Picking a cell that holds a phrase makes no sound in this feature. Feature 5 adds the speech. Here the cell does not change, and screen readers get the phrase.
22. Back is a tile in the data. It goes to the previous screen. On the first boards it is the first cell of the first group, on every board except home.
23. My boards holds typical topic boards, as found in Proloquo2Go or Grid 3.
40. The keyboard is part of this feature. A keyboard is a board in the data that is always drawn in the rows layout, and its letters are tiles.

## Not in the specs. Answered by the user on 2026-11-16

24. **Confirmed by the user on 2026-11-16.** The first set under My boards is six boards of eight cells: Food, Drinks, Feelings, People, Places and Activities. Quick phrases holds eight cells. The table gives the labels. Each cell has a phrase and a Mulberry symbol.

    | Board | Cells |
    | --- | --- |
    | Quick phrases | Yes, No, More, Good, Hello, Finished, I don't know, Wait |
    | Food | Breakfast, Lunch, Dinner, Snack, Fruit, Soup, Bread, Something sweet |
    | Drinks | Water, Tea, Coffee, Juice, Milk, Something cold, Something hot, Straw |
    | Feelings | Happy, Sad, Tired, Angry, Scared, Worried, Hungry, Fine |
    | People | Family, Grandparents, Carer, Doctor, Nurse, Visitor, Partner, Parents |
    | Places | Home, Bedroom, Bathroom, Kitchen, Garden, Outside, Shop, Hospital |
    | Activities | TV, Music, Read, Go out, Rest, Phone call, Game, Shower |

    **Changed by the user on 2026-11-16 during implement.** Mulberry has no symbol for Please, Thank you, Goodbye, Bored, Uncomfortable, Friend or Everyone. Under item 27 the user chose to change the labels. The table above holds the new labels: More, Good, Finished, Worried, Hungry, Grandparents and Parents.

25. **Confirmed by the user on 2026-11-16.** Needs holds the twelve cells, labels and phrases of the Needs mockup, in three groups of four. The Back tile is added to the first group of Needs, so that group holds five cells. Every other board in item 24 holds Back and its eight cells in three groups of three. My boards holds Back and its six cells in three groups, of three, two and two.
26. **Confirmed by the user on 2026-11-16.** The phrase of a drafted cell is a short sentence written during implement, such as "I would like some water" for Water. The user reviews the phrases in the JSON before the merge.
27. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** If no Mulberry symbol fits a cell, implement stops and asks the user. It does not draw a new symbol or change one.
28. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** A tile has an `id`, a `label`, a `colour`, a `style` and an optional `hue` of `c1` to `c5` for the Colours theme. The colour is `dark`, `light`, `soft1`, `grey`, `ink`, `green` or `red`. The `ink` colour is new in this feature. It is the theme's near black `--ink` with a light label. The `green` and `red` colours are also new, and they are the same in every theme. The style is `bleed`, `signage`, `stage`, `symbol`, `key` or `message`. A bleed, signage or stage tile names an `icon`, which is one of the names in `ICON_NAMES` in `src/app/boards/board-data.ts`. A key with an icon shows its label beside the icon when the tile has `caption` set to true. A symbol tile names a `symbol`, which is a file in the symbols folder.
29. **Follows from what the user said on 2026-11-16.** A tile can have one `action`, and an action has a `type`. The types are `open`, which names a board by id, `speak`, which gives a phrase, `back`, `type`, `backspace`, `clear` and `caps`. Item 43 covers the last four. A tile with no action does nothing when pressed. The Keyboards tile opens the `keyboard` board.
30. **Confirmed by the user on 2026-11-16.** A board also has a `title`, which the header shows. The home screen is the board with the id `home`. A board opens at the address `/board/` followed by its id, and an unknown id shows the home screen.
31. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** The home cells keep the mockup's values: My boards is `dark`, `c1`, `bleed`, with the `board` icon. Needs is `soft1`, `c2`, `bleed`, with `heart`. Quick phrases is `grey`, `c3`, `bleed`, with `chat`. Keyboards is `dark`, `c5`, `bleed`, with `keyboard`. My boards and Needs form group 1, and Quick phrases and Keyboards form group 2. No home cell gives a size, so the four are equal.
32. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** There is one Back tile, with the id `back`, and each board lists it. It reads "Back" and is near black, as the user asked on 2026-11-16, so its colour is `ink`. It is `stage`, as the user asked on 2026-11-16 during implement, so its left arrow icon named `back` sits bare in the middle with the label centred under it. The mockups have no such icon, so it is drawn new in the same line style. The tile returns to the screen that opened the board, or to home when the board was opened by its address. A board written without the Back tile has no way out, and the data check does not refuse it.
33. **Decided by the user on 2026-11-16.** A pressed cell does not change colour in this feature. The dark picked look of the Needs mockup comes with the speech in feature 5.
34. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** The layout setting covers the home screen and every board that does not fix its own layout, as item 42 allows. It uses local storage under the key `symple.layout`, with the values `columns` and `rows`. An unknown value or a storage error gives `columns`.
35. **Confirmed by the user on 2026-11-16.** The data files are `src/data/boards.json` and `src/data/cells.json`, built into the app. The symbols are in `public/symbols/` with `ATTRIBUTION.txt`, which lists each file and its original Mulberry name. The visible credit inside the app comes with the settings panel in feature 8, and the README carries it until then.
36. **Decided by the user on 2026-11-16.** Data that breaks a rule is skipped in the layout, and the rest is drawn. A cell is skipped when it or its tile breaks a rule in items 16 to 30 or 42 to 46, and the other cells of its group fill the space. A board is skipped when its own fields break a rule, and a tile that opens a skipped or missing board is skipped too. When two tiles or two boards share an id, the first is kept. Each skip is written to the console as a warning that names the fault. The unit tests fail if the shipped files have any fault.
37. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** The mockup's size classes `big` and `short` are not in the data. A cell sizes its label and its icon from its own box, because the same cell can be tall in one layout and wide in the other.
38. **Accepted on 2026-11-16 under the user's standing yes for layout, labels and icons.** The icon drawings live in the code, and the data names an icon. This is a stated exception to the data rule, because an icon is a drawing and not board content.
39. **Confirmed by the user on 2026-11-16.** Feature 1's end to end case E6 says that Tab lands on no control. That is no longer true, so case E4 in validation.md replaces it.

## The keyboard. Answered by the user on 2026-11-16

41. **Confirmed by the user on 2026-11-16.** The suggested words stay in feature 7, which becomes "Word suggestions". They need a language model and the patent check, and neither belongs in this feature. Speaking the message stays in feature 5. Here the keyboard writes a message on screen and makes no sound.
42. **Follows from what the user said on 2026-11-16.** A board can give a `layout` of `columns` or `rows`. A board that gives one is always drawn that way, and the stored setting is not used for it. The two keyboard boards give `rows`.
43. **Decided by the user on 2026-11-16.** Backspace, Clear and Caps lock are ordinary tiles. Each has an action type that changes the message held in the app's state, and the message tile shows that state. The `type` action gives a piece of text and adds it to the end of the message. The `backspace` action removes the last character, and the `clear` action empties the message. The `caps` action turns caps lock on or off, and it stays on until it is picked again. While it is on, the letter keys show capital letters and type them, and screen readers are told that it is pressed.
44. **Confirmed by the user on 2026-11-16.** The app holds one message. A tile with the style `message` shows it with a caret at the end, and its name for screen readers is the message. Each change is written to the status region. The message is kept when the user moves between boards, and it is lost when the app is closed. Pressing the message tile does nothing until feature 5.
45. **Decided by the user on 2026-11-16.** Size and span are one thing. There is no `span` field. A wide key gives its `size` as a number of parts, as item 16 allows. The number must be whole and at least 1.
46. **Confirmed by the user on 2026-11-16.** A tile with the style `key` shows its label large in the middle of the cell, as in `context/design/mockups/keyboard/keyboard-qwerty-blue.html`, or its icon when it names one. A tile can give a `name` for screen readers when its label is a sign, such as "Full stop" for the full stop key. The letter keys and Space are `light`. Backspace and Clear are `grey`. Caps lock is `soft1`, because the mockup's lighter grey is not one of the cell colours. The 123 key and the ABC key are `dark`. Clear shows a trash icon with its label beside it. The Backspace and Caps lock icons are copied from the mockup.
47. **Confirmed by the user on 2026-11-16.** The `keyboard` board has the title "Keyboard" and five groups, without the mockup's row of suggested words. Group 1 holds Back and the message, with sizes of 1 and 9. Groups 2 to 4 hold the three letter rows of the mockup, ten keys each: q to p, then a to l and Backspace, then Caps lock, z to m, the full stop and the question mark. Group 5 holds 123, Space and Clear, with sizes of 2, 6 and 2. The 123 key opens the board `keyboard-numbers`.
48. **Confirmed by the user on 2026-11-16.** The `keyboard-numbers` board has the title "Numbers and symbols" and the same five groups. Its Back tile returns to the letters. Group 2 holds 1 to 9 and 0. Group 3 holds `- / : ; ( ) & @ " '`. Group 4 holds `, ! £ $ % + = . ?` and Backspace. Group 5 holds ABC, Space and Clear, with sizes of 2, 6 and 2. The ABC key sits where the 123 key sits on the letters, is `soft1` and opens the board `keyboard`. A screen is kept once in the list that Back uses, so switching between the two keyboards does not add steps to Back.
49. **Decided by the user on 2026-11-16.** A key has no size rule of its own. Keys follow the dynamic grid of item 17 and expand to fill their row, like every other cell. No cell on any board has a minimum size in pixels.

50. **Decided by the user on 2026-11-16 during implement.** Each board has roughly as many groups as it has cells in a group. Home is two groups of two. Needs keeps its three groups. The other boards of item 24 are three groups of three, and My boards is three groups of three. The keyboards keep their five rows. Items 25 and 31 hold the new grouping.
51. **Decided by the user on 2026-11-16 during implement.** The cells of My boards use the `stage` style with outlined Material icons in place of Mulberry symbols. Their colours are mixed between `dark`, `soft1` and `grey`, and each has a hue for the Colours theme. The Material icons are by Google and are used under the Apache License 2.0.
52. **Decided by the user on 2026-11-16 during implement.** My boards also opens a board called "Yes or no". It holds Back, a green Yes with a tick and a red No with a cross, one in each group. Yes says "Yes" and No says "No". The green and the red do not change with the theme.
53. **Decided by the user on 2026-11-16 during implement.** My boards also opens a board called "Core words". It holds the 36 words of the Universal Core location sheet in the same places: six columns of six, with Back in a column of its own. The board fixes the columns layout, so each word keeps its place. Each word says itself. The symbols are Mulberry symbols, because the Widgit symbols on the sheet are under copyright. Mulberry has no symbol for like, not, different, he, she, you, that, it, do, here, all, can and stop, so these use the nearest stand in and need the user's review. Stop is the raised hand from OpenMoji, which has the same licence as Mulberry, at the user's request.

## Out of this feature


- Scanning and the scan highlight states are feature 4.
- Speech is feature 5, and that includes speaking the keyboard's message.
- The suggested words on the keyboard are feature 7.
- The layout picker and the settings panel are feature 8.
- Editing boards, and the Add button of item 19, are feature 9.
- The cell styles `hero`, `bare`, `side` and `media` in the home mockup are not built, because no cell in the first data uses them. The `stage` style is built for the Back tile, with its rules copied from the home mockup. The `signage` style is built and no shipped tile uses it.
- No patent check is needed, because this feature generates no content and no suggestions. The keyboard here types only the keys the user picks. The Feelings board is fixed data that the user picks from by hand.
