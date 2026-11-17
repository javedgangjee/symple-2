# Feature 2: Home screen and boards from data. Validation

The numbers in brackets are the items in requirements.md that a check covers.

## Automated checks

### A1. Build (3, 35)

Command: `npm run build`

- The build ends with no errors and no warnings.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (2, 3, 4, 5, 7, 13, 16, 17, 18, 19, 21, 22, 24, 25, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 40, 42, 43, 44, 45, 46, 47, 48)

Command: `npm test`

Board data with the real files, in `src/app/boards/board-data.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| D1 | The `home` board. | It has the title "Home" and two groups. Group 1 holds `my-boards` and `needs`. Group 2 holds `quick-phrases` and `keyboards`. No cell has a size. No board lists a Devices tile. |
| D2 | The four home tiles. | Each has the label, icon, colour, hue and style of requirement 31. My boards, Needs, Quick phrases and Keyboards open `my-boards`, `needs`, `quick-phrases` and `keyboard`. |
| D3 | The `needs` board. | It has the title "Needs" and three groups. The first cell of group 1 is the Back tile. After it, the groups hold four cells each, with the labels and phrases in the table below, in that order. |
| D4 | The `my-boards` board. | It has three groups of three cells. The first cell of group 1 is the Back tile. The eight cells after it read Food, Drinks, Feelings, People, Places, Activities, Yes or no and Core words, and each opens its board. Each is `stage` with a Material icon and no symbol. The colours are mixed as in requirement 51. |
| D5 | The boards of requirement 24. | Each has three groups of three cells. The first cell of group 1 is the Back tile. The eight cells after it have the labels of requirement 24, in that order. Each of those cells has a phrase that is not empty. |
| D6 | Every symbol tile. | Its symbol file exists in `public/symbols/`, and `ATTRIBUTION.txt` lists that file. |
| D7 | Every board. | It can be reached from `home` by tiles that open boards. |
| D8 | Every board. | The `home` board has no Back tile. Every other board has exactly one, as the first cell of its first group. The Back tile reads "Back", is `ink` and `stage`, and has the icon `back`. |
| D12 | The two shipped files. | The list of faults is empty. |
| D9 | The `keyboard` board. | It has the title "Keyboard", the layout `rows` and five groups. Group 1 holds Back with a size of 1 and the message tile with a size of 9. Group 2 holds the keys q, w, e, r, t, y, u, i, o and p. Group 3 holds a, s, d, f, g, h, j, k, l and Backspace. Group 4 holds Caps lock, z, x, c, v, b, n, m, the full stop and the question mark. Group 5 holds 123, Space and Clear with sizes of 2, 6 and 2. |
| D10 | The keys of the `keyboard` board. | Each letter key types its own letter and is `key` and `light`. Space types one space. The full stop has the name "Full stop", and the question mark has the name "Question mark". Backspace, Clear and Caps lock have the action types `backspace`, `clear` and `caps`. The 123 key opens `keyboard-numbers` and is `dark`. Clear has the icon `trash` and a caption. |
| D11 | The `keyboard-numbers` board. | It has the title "Numbers and symbols", the layout `rows` and five groups. Group 1 is the same as on `keyboard`. Groups 2 to 4 hold the keys of requirement 48 in that order, and each types its own sign. Group 5 holds ABC, Space and Clear with sizes of 2, 6 and 2, and ABC opens `keyboard` and is `dark`. |
| D13 | The `yes-no` board. | It has the title "Yes or no" and three groups of one cell: Back, then Yes, which is `green` and `stage` with the icon `check` and says "Yes", then No, which is `red` and `stage` with the icon `cross` and says "No". |
| D14 | The `core-words` board. | It has the title "Core words", the layout `columns` and seven groups. Group 1 holds Back. Groups 2 to 7 hold the six columns of requirement 53, six words each. Each word is a symbol tile that says its own label. |

Expected labels and phrases for case D3, from the Needs mockup:

| Group | Label | Phrase |
| --- | --- | --- |
| 1 | Help | I need help |
| 1 | Pain | I am in pain |
| 1 | Toilet | I need the toilet |
| 1 | Drink | I need a drink |
| 2 | Eat | I am hungry |
| 2 | Medicine | I need my medicine |
| 2 | Hot | I am too hot |
| 2 | Blanket | I am cold. I need a blanket |
| 3 | Bed | I want to go to bed |
| 3 | Move me | Please move me |
| 3 | Itch | I have an itch |
| 3 | Glasses | I need my glasses |

Board data rules, in the same file. Each case starts from valid test data and changes one thing. "Skipped" means that the cell is not in the board that the loader returns, the other cells of its group are still there in order, and the list of faults has one entry whose text holds the quoted word.

| Case | Input | Expected result |
| --- | --- | --- |
| R1 | A cell names the tile `nope`. | The cell is skipped, with `nope`. |
| R2 | Two tiles have the id `needs`. | The first is kept. The list of faults has one entry with `needs`. |
| R3 | Two boards have the id `food`. | The first is kept. The list of faults has one entry with `food`. |
| R4 | A tile has the colour `pink`. | Its cell is skipped, with `pink`. |
| R5 | A tile has the icon `rocket`. | Its cell is skipped, with `rocket`. |
| R6 | A tile has the style `hero`. | Its cell is skipped, with `hero`. |
| R7 | A tile has the hue `c9`. | Its cell is skipped, with `c9`. |
| R8 | A tile has an empty label. | Its cell is skipped, with the tile's id. |
| R9 | A cell has the size `huge`. | The cell is skipped, with `huge`. |
| R10 | A bleed tile has no icon. | Its cell is skipped, with the tile's id. |
| R11 | A symbol tile has no symbol. | Its cell is skipped, with the tile's id. |
| R12 | A tile opens the board `nowhere`. | Its cell is skipped, with `nowhere`. |
| R13 | A tile has two actions. | Its cell is skipped, with the tile's id. |
| R14 | A board has no title. | The board is skipped, with its id. A tile that opens it is skipped too. |
| R15 | A board has six groups, and a group has six cells. | Nothing is skipped, and the list of faults is empty. |
| R16 | A group has no cells, and a second board has no groups. | Nothing is skipped, and the list of faults is empty. |
| R17 | A cell has no size. | Nothing is skipped, and the cell has no size. |
| R18 | The service is asked for the board `missing`. | It gives no board, and no error is thrown. |
| R19 | A board has the layout `diagonal`. | The board is skipped, with `diagonal`. |
| R20 | A board has no layout. | Nothing is skipped, and the board has no layout. |
| R21 | A cell has a size of 0. A second cell has a size of 1.5. | Each cell is skipped. |
| R22 | A cell has a `span` field. | The cell is skipped, with `span`. |
| R23 | A tile has an action of the type `enter`. | Its cell is skipped, with `enter`. |
| R24 | An `open` action names no board. A `speak` action gives no phrase. | Each cell is skipped. |
| R25 | A `type` action gives an empty text. | Its cell is skipped, with the tile's id. |
| R26 | One cell of a group of three names the tile `nope`. | The group holds the two other cells, and no error is thrown. |
| R27 | The service loads data with one fault. | One warning is written to the console, and it holds the text of the fault. |

Message, in `src/app/keyboard/message.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| G1 | Nothing has been typed. | The message is empty, and caps lock is off. |
| G2 | Type "h", then "i". | The message is "hi". |
| G3 | The message is "hi". Backspace. | The message is "h". |
| G4 | The message is empty. Backspace. | The message is empty, and no error is thrown. |
| G5 | The message is "hi there". Clear. | The message is empty. |
| G6 | Turn caps lock on, type "h", turn it off, type "i". | The message is "Hi". Caps lock stayed on until it was turned off. |
| G7 | Caps lock is on. Type "1" and " ". | The message is "1 ". |

Layout service, in `src/app/layout/layout.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| L1 | Nothing is stored. | The layout is `columns`. |
| L2 | `symple.layout` holds `rows`. | The layout is `rows`. |
| L3 | `symple.layout` holds `diagonal`. | The layout is `columns`. |
| L4 | Reading storage throws an error. | The layout is `columns`, and no error is thrown. |
| L5 | The layout is set to `rows`. | The layout is `rows`, and `symple.layout` holds `rows`. |
| L6 | The layout is set to `rows` and writing storage throws an error. | The layout is `rows`, and no error is thrown. |

Cell, in `src/app/cells/cell.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| C1 | The home tile Needs. | There is one button with the name "Needs". It has the classes `cell`, `soft1`, `c2` and `bleed`. It holds one icon, and the icon is hidden from screen readers. |
| C2 | The Back tile. | The button has the name "Back" and the classes `cell`, `ink` and `stage`, and none of `c1` to `c5`. |
| C3 | The Needs tile Help. | The button has the name "Help" and the class `symbol`. It holds one image whose address ends in `symbols/help.svg` and whose alt text is empty. |
| C4 | The button is drawn. | It is not disabled, and its type is `button`. |
| C5 | The button is pressed. | The cell reports one press with its tile. |
| C6 | The key tile "q", with caps lock off and then on. | The button has the class `key` and shows "q", then "Q". Its name is "q", then "Q". |
| C7 | The full stop key. | The button shows "." and has the name "Full stop". |
| C8 | The Caps lock key, with caps lock off and then on. | The button has the name "Caps lock" and holds one icon. `aria-pressed` is `false`, then `true`. |
| C9 | The message tile, with the message "hi". | The button has the class `message`, shows "hi" and a caret, and has the name "hi". The caret is hidden from screen readers. |

Board screen, in `src/app/boards/board-screen.spec.ts`. The board service is replaced with test data.

| Case | Input | Expected result |
| --- | --- | --- |
| S1 | A board with two groups. The first holds "A" and "B", and the second holds "C". | The screen has two groups. The buttons read "A", "B" and "C" in that order, with "A" and "B" in the first group. |
| S2 | A board with one group that holds "X". | The screen has one group and one button, named "X". |
| S3 | The layout is `columns`, then `rows`. | The grid has `data-layout="columns"`, then `data-layout="rows"`. |
| S4 | A group holds "A" with the size `large` and "B" with no size. | The shares of "A" and "B" are 5 and 4. |
| S5 | A board with three groups, and no cell has a size. | The screen has three groups, and every cell has the same share. |
| S6 | A board with two groups. The second holds no cells. | The screen has two groups and one button. The second group holds no control. |
| S7 | A board with no groups. | The screen has no group and no button. |
| S8 | A tile that speaks "I need help" is pressed. | The status region reads "I need help". The cell keeps the same classes, and the screen does not change. |
| S9 | A tile that opens `food` is pressed. | The app goes to `/board/food`. |
| S10 | A tile that opens nothing and speaks nothing is pressed. | Nothing changes, and the status region stays empty. |
| S11 | The Back tile is pressed. | The way back is asked to go back once. |
| S12 | A board with the layout `rows`, while the stored layout is `columns`. | The grid has `data-layout="rows"`. |
| S13 | A group holds "A" with a size of 2, "B" with a size of 6, "C" with the size `small` and "D" with no size. | The shares of "A", "B", "C" and "D" are 2, 6, 3 and 4. |
| S14 | A tile that types "a" is pressed twice. | The message is "aa", and the status region reads "aa". |
| S15 | The message is "aa". The Backspace key is pressed, then the Clear key. | The message is "a", then empty. The status region reads "a", then is empty. |
| S16 | The message tile is pressed. | Nothing changes. |

The way back, in `src/app/boards/back.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| K3 | Home, then `my-boards`, then `food`. Back is pressed twice. | The app shows `my-boards`, then home. |
| K4 | `food` is the first screen of the session. Back is pressed. | The app shows home. |
| K5 | Home, then `keyboard`, then `keyboard-numbers`, then `keyboard` again. Back is pressed. | The app shows home. |

### A4. End to end tests (1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 17, 20, 21, 22, 23, 30, 32, 34, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49)

Command: `npm run e2e`

Every case runs in Chromium at 1024 by 768 and at 1440 by 900. "Both layouts" means the case runs once with nothing stored and once with `symple.layout` set to `rows`. "Every board" means home and the eleven other boards.

Home, in `e2e/home.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| E1 | Open `/` with nothing stored. | The main area holds two groups and four buttons. They read My boards, Needs, Quick phrases and Keyboards, in that order. No button reads Devices, Messaging, Music, Photos, Video, Games or Back. |
| E2 | Open `/` with nothing stored. | The two groups sit side by side and have the same width. The two cells of each group are stacked. The four cells have the same size, within 2px. |
| E3 | Store `rows` and reload. | The two groups are stacked and have the same height. The two cells of each group run left to right. The four cells have the same size, within 2px. |
| E4 | Both layouts. Press Tab four times, then once more. | Focus lands on My boards, Needs, Quick phrases and Keyboards in turn. The fifth press does not land on the settings button. |
| E5 | In each of the five themes, for each of the four home cells. | The label colour has a contrast of at least 4.5 to 1 against the cell's glass fill laid over the worst backdrop. The worst backdrop is white for a cell with a light label and `--canvas-3` for a cell with a dark label. |
| E6 | The Colours theme. | The `--bg` of My boards is `oklch(0.42 0.115 250)`, of Needs `oklch(0.42 0.115 20)`, of Quick phrases `oklch(0.42 0.115 190)` and of Keyboards `oklch(0.40 0.19 285)`. |
| E7 | Press Tab once. | My boards has an outline in the `--ink` colour that is at least 4px wide. The `--ink` colour has a contrast of at least 3 to 1 against `--canvas`. |
| E8 | Press Keyboards. | The address is `/board/keyboard`, the `h1` reads "Keyboard", and the console shows no error. |

Boards, in `e2e/boards.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| B1 | On home, press Needs. | The address is `/board/needs`, and the `h1` reads "Needs". The main area holds three groups and thirteen buttons. The first reads "Back", and the rest have the labels of case D3 in that order. |
| B2 | Open `/board/needs` in both layouts. | With nothing stored, the three groups sit side by side and the cells of each are stacked. With `rows` stored, the three groups are stacked and the cells of each run left to right. The eight cells of groups 2 and 3 have the same size, within 2px, and the five cells of group 1 have the same size as each other. |
| B3 | Open every board. | Each symbol image has loaded, came from the app's own host, and has empty alt text. |
| B4 | On Needs, press Help. | The status region reads "I need help". The address does not change, and the background colour of Help is the same before and after the press. |
| B5 | On Needs, press Back. | The app shows home, and no button reads "Back". |
| B6 | Home, My boards, Food, Back, Back. | The `h1` reads "My boards", "Food", "My boards" and "Home" in turn. My boards holds Back and the eight buttons of case D4. Food holds Back and its eight buttons. |
| B7 | Open `/board/food` by its address and press Back. Then open `/board/nope`. | Both end on home with the `h1` "Home". |
| B8 | On Needs, in both layouts, press Tab thirteen times, then once more. | Focus lands on Back, then on the twelve other cells in the order of the data. The last press does not land on the settings button. |
| B9 | Every board, in both layouts. | The page does not scroll in either direction. Every cell lies inside the main area. The groups fill the main area, and the cells of each group fill that group, with only the gaps left over. No label is cut off. |
| B10 | Every board, in both layouts. | The gap between each pair of neighbouring cells, and between neighbouring groups, equals the gap between the header and the main area. |
| B11 | Every board in the Blue theme, and home and Needs in each of the five themes, in both layouts. | axe reports no violations for WCAG 2.2 Level AA. |
| B12 | Needs in each of the five themes. | The label has a contrast of at least 4.5 to 1 against the cell's fill. The Back tile's `--bg` is the value of `--ink`, and its label has a contrast of at least 4.5 to 1 against its glass fill laid over white. |
| B13 | Home and Needs with less transparency asked for. | Each cell has a background colour with no transparency and no backdrop blur, and the label has a contrast of at least 4.5 to 1 against it. |
| B14 | Open Needs and wait for the fonts. | The label of Help uses Libre Franklin. |
| B15 | Request `/symbols/ATTRIBUTION.txt`. | The file is served and holds the words "Mulberry" and "Creative Commons Attribution-ShareAlike 4.0". |
| B16 | The Yes or no board in each of the five themes. Then press Yes. | The board holds Back, Yes and No. The `--bg` of Yes is `oklch(0.43 0.12 150)` and of No is `oklch(0.43 0.16 27)` in every theme. Each label has a contrast of at least 4.5 to 1 against its glass fill. The status region reads "Yes". |

Keyboard, in `e2e/keyboard.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| Y1 | On home, press Keyboards. | The main area holds five groups and thirty five buttons. The first reads "Back", and the second is the message, which is empty. No row of suggested words is shown. |
| Y2 | Open `/board/keyboard` with nothing stored, then with `rows` stored. | Both times the five groups are stacked and the keys of each run left to right. The thirty keys of groups 2 to 4 have the same size, within 2px. The message is nine times as wide as Back, and Space is three times as wide as 123 and as Clear, within 2px after the gaps are taken out. |
| Y3 | Press h, i, Space, Caps lock, m, Caps lock, o, m and the full stop. | The message shows "hi Mom.", and the status region reads "hi Mom.". While caps lock was on, the letter keys showed capitals and Caps lock had `aria-pressed="true"`. |
| Y4 | The message is "hi". Press Backspace, then Clear. | The message shows "h", then is empty. |
| Y5 | The message is "hi". Press 123, then 2, then Back. | The `h1` reads "Numbers and symbols", then "Keyboard". The message shows "hi2" on both boards. |
| Y6 | The message is "hi". Press Back, then Keyboards. | The app shows home, then the keyboard, and the message still shows "hi". |
| Y7 | The message is "hi". Press the message. | Nothing changes, and the app makes no request to speak. |
| Y8 | Press Tab thirty five times, then once more. | Focus lands on Back, the message, then the keys in the order of the data. The last press does not land on the settings button. |
| Y9 | Type sixty letters. | The message stays inside its cell, the end of the text is in view, and the page does not scroll. |
| Y10 | The keyboard in each of the five themes. | axe reports no violations for WCAG 2.2 Level AA. The label of each key has a contrast of at least 4.5 to 1 against its glass fill laid over the worst backdrop. |
| Y11 | On home, press Keyboards, then 123, then ABC, then Back. | The `h1` reads "Numbers and symbols", then "Keyboard", then "Home". On the numbers board ABC is as wide as Clear, within 2px. |

The cases of feature 1 in `e2e/shell.spec.ts` must still pass, except E6, which case E4 replaces.

### A5. Makefile

Command: `make check`

- The command runs lint, format-check, test, e2e and build in turn and ends with no errors.

## Manual checks

### M1. The home screen matches the mockup (10)

1. Run `make start` and open `http://localhost:4200` in Safari on the Mac.
2. Open `context/design/home.html` in a second window of the same size.
3. Compare the four cells in each of the five themes. Set the app's theme with `localStorage.setItem('symple.theme', 'teal')` and a reload.

Expected result: each cell has the same colour, glass, icon and label style as in the mockup. The app shows the four cells as two columns of two equal cells where the mockup shows three columns of mixed sizes, and it has no Devices cell.

### M2. The Needs board matches the mockup (10, 13)

1. In the console, run `localStorage.setItem('symple.layout', 'rows')` and reload. Press Needs.
2. Open `context/design/mockups/needs/needs-blue.html` in a second window of the same size.

Expected result: the cells, the symbols and the labels look the same in both windows, apart from the glass look and the Back tile. Pressing Help in the app changes nothing on screen and makes no sound.

### M3. Both layouts read well on every board (13, 17, 37)

1. Open each of the fourteen boards in the columns layout and in the rows layout, at a small and a large window size.

Expected result: each label is whole and easy to read, each symbol is whole, and no icon covers a label.

### M4. The phrases and the symbols are right (24, 26, 27)

1. Open `src/data/cells.json` and read the phrase of each drafted cell.
2. Open each board under My boards, and Quick phrases, and look at each symbol.

Expected result: each phrase says what the user would mean by the cell, and each symbol fits its label.

### M5. Less transparency (10)

1. On the Mac, turn on Reduce transparency in System Settings, under Accessibility and then Display.
2. Reload the app.

Expected result: every cell has a solid fill with no blur.

### M6. The keyboard matches the mockup (40, 46, 47)

1. Press Keyboards on the home screen.
2. Open `context/design/mockups/keyboard/keyboard-qwerty-blue.html` in a second window of the same size.
3. Type a short message in the app.

Expected result: the message and the keys look the same in both windows, apart from the glass look, the Back tile, the missing row of suggested words and the colour of Caps lock and 123. The app makes no sound.

## Not checked in this feature

Scanning is feature 4. Cases E4 and B8 stand in for the scanning test that tech-stack.md asks for.

Safari and the iPad's WebKit are not tested by the automated checks. Manual checks M1 and M2 use Safari on the Mac.

Requirements 14, 19 and 20 only move work to other features, so they have no check beyond case R16.
