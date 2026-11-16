import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, ResolveFn, Router, Routes } from '@angular/router';
import { BoardData, HOME_BOARD_ID } from './boards/board-data';
import { BoardScreen } from './boards/board-screen';

/** The id of the board that a route shows. The home route gives it as data and a board route as a parameter. */
function boardId(route: ActivatedRouteSnapshot): string {
  return route.paramMap.get('id') ?? HOME_BOARD_ID;
}

/** The header shows the title of the board. */
const boardTitle: ResolveFn<string> = (route) =>
  inject(BoardData).board(boardId(route))?.title ?? '';

/** An unknown board id opens the home screen. */
const boardExists: CanActivateFn = (route) =>
  inject(BoardData).board(boardId(route)) ? true : inject(Router).createUrlTree(['/']);

export const routes: Routes = [
  { path: '', component: BoardScreen, data: { id: HOME_BOARD_ID }, title: boardTitle },
  { path: 'board/:id', component: BoardScreen, canActivate: [boardExists], title: boardTitle },
  // Any unknown path opens the home screen.
  { path: '**', redirectTo: '' },
];
