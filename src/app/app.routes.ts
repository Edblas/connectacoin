import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Ecosystem } from './pages/ecosystem/ecosystem';
import { Metas } from './pages/metas/metas';
import { Whitepaper } from './pages/whitepaper/whitepaper';
import { TokenomicsPage } from './pages/tokenomics/tokenomics';
import { Help } from './pages/help/help';

export const routes: Routes = [
  { path: '', component: Home, title: 'CNTA connecta | Home' },
  { path: 'ecossistema', component: Ecosystem, title: 'Ecossistema | CNTA connecta' },
  { path: 'metas', component: Metas, title: 'Programa de Metas | CNTA connecta' },
  { path: 'whitepaper', component: Whitepaper, title: 'Whitepaper | CNTA connecta' },
  { path: 'tokenomia', component: TokenomicsPage, title: 'Tokenomia e Roadmap | CNTA connecta' },
  { path: 'ajuda', component: Help, title: 'FAQ e Contato | CNTA connecta' },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
