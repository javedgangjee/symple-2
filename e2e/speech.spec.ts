import { expect, type Page } from '@playwright/test';
import boardsFile from '../src/data/boards.json' with { type: 'json' };
import cellsFile from '../src/data/cells.json' with { type: 'json' };
import { cell, statusRegion } from './support/boards';
import {
  POST_CLICK_DELAY,
  boardCells,
  cellAt,
  groups,
  pass,
  pickByScan,
  pointAt,
  test,
} from './support/scan';
import { endSpeech, speechLog, spokenTexts } from './support/speech';

const DWELL_TIME = 1000;

/** The phrase of each cell of the Needs board, in the order of the data. Back has none. */
function needsPhrases(): (string | undefined)[][] {
  const needs = boardsFile.find((board) => board.id === 'needs');
  if (!needs) {
    throw new Error('boards.json has no Needs board.');
  }
  return needs.groups.map((group) =>
    group.cells.map(({ tile }) => {
      const action = cellsFile.find((candidate) => candidate.id === tile)?.action;
      return action?.type === 'speak' ? action.phrase : undefined;
    }),
  );
}

/** Finds a cell of the board on show by its name, as a group and a place in the group. */
async function placeOf(page: Page, name: string): Promise<[number, number]> {
  const names = await boardCells(page);
  const group = names.findIndex((groupNames) => groupNames.includes(name));
  if (group === -1) {
    throw new Error(`The board has no cell named "${name}".`);
  }
  return [group, names[group].indexOf(name)];
}

/** Picks a cell by its name with one switch. */
async function pickByName(page: Page, name: string): Promise<void> {
  await pickByScan(page, ...(await placeOf(page, name)));
}

test('SE1: each of the twelve phrases of Needs is spoken when the scan picks its cell', async ({
  open,
}) => {
  test.slow();
  const page = await open('needs', 'Needs');
  const phrases = needsPhrases();
  const expected: string[] = [];
  for (const [group, groupPhrases] of phrases.entries()) {
    for (const [index, phrase] of groupPhrases.entries()) {
      if (phrase === undefined) {
        continue;
      }
      await pickByScan(page, group, index);
      expected.push(phrase);
      expect(await spokenTexts(page)).toEqual(expected);
      await endSpeech(page);
      // The scan starts again by itself at the first group.
      await pass(page, POST_CLICK_DELAY);
    }
  }
  expect(expected.length).toBe(12);
  expect(expected[0]).toBe('I need help');
  expect(expected).toContain('I am cold. I need a blanket');
});

test('SE2: the confirmed look ends with the post click delay while the speech still runs', async ({
  open,
}) => {
  const page = await open('needs', 'Needs');
  const [group, index] = await placeOf(page, 'Help');
  await pickByScan(page, group, index);
  await expect(cellAt(page, group, index)).toHaveAttribute('data-confirmed', '');
  await pass(page, POST_CLICK_DELAY - 100);
  await expect(cellAt(page, group, index)).toHaveAttribute('data-confirmed', '');
  await pass(page, 100);
  await expect(page.locator('main [data-confirmed]')).toHaveCount(0);
  await expect(groups(page).nth(0)).toHaveAttribute('data-scan', '');
  // Nothing ended or cancelled the speech, so it still runs.
  expect((await speechLog(page)).at(-1)).toBe('speak:I need help');
});

test('SE4: the message is spoken when the scan picks it', async ({ open }) => {
  const page = await open('keyboard', 'QWERTY keyboard');
  // The message takes the name of what is written, so its place is read before a key is picked.
  const message = await placeOf(page, 'Message');
  for (const key of ['h', 'i']) {
    await pickByName(page, key);
    await pass(page, POST_CLICK_DELAY);
  }
  await pickByScan(page, ...message);
  expect(await spokenTexts(page)).toEqual(['hi']);
});

test('SE5: a second phrase cancels the first one that still speaks', async ({ open }) => {
  const page = await open('yes-no', 'Yes or no');
  await pickByName(page, 'Yes');
  await pass(page, POST_CLICK_DELAY);
  await pickByName(page, 'No');
  const log = await speechLog(page);
  expect(await spokenTexts(page)).toEqual(['Yes', 'No']);
  expect(log.slice(log.indexOf('speak:Yes') + 1, log.indexOf('speak:No'))).toContain('cancel');
});

test('SE7: a dwell on a cell speaks its phrase', async ({ open }) => {
  const page = await open('needs', 'Needs', { selectionMode: 'dwell', dwellTime: DWELL_TIME });
  await pointAt(page, cell(page, 'Pain'));
  await pass(page, DWELL_TIME);
  expect(await spokenTexts(page)).toEqual(['I am in pain']);
});

test('SE8: with no Web Speech API a pick still tells the phrase and the scan goes on', async ({
  open,
}) => {
  const page = await open('needs', 'Needs', {}, 'none');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await pickByName(page, 'Help');
  await expect(statusRegion(page)).toHaveText('I need help');
  await pass(page, POST_CLICK_DELAY);
  await expect(groups(page).nth(0)).toHaveAttribute('data-scan', '');
  expect(errors).toEqual([]);
});
