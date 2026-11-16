import assert from 'node:assert/strict';
import test from 'node:test';
import Holidays from 'date-holidays';
import './server-test-loader.mjs';
const {GET}=await import('../src/app/api/calendar/observances/route.ts');
const {buildCalendarObservances}=await import('../src/lib/events/holidayObservances.ts');
const cases=[['UA','uk','08-24'],['PL','pl','05-03'],['DE','de','10-03'],['GB','en','12-25'],['RU','ru','01-01']];
for(const[country,locale,fixed]of cases){
 test(`actual calendar endpoint preserves ${country}/${locale} dates, localization and country catalog`,async()=>{
  for(const year of [2024,2026,2027]){
   const r=await GET(new Request(`http://localhost/api/calendar/observances?country=${country}&locale=${locale}&year=${year}`));assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/max-age=86400/);
   const body=await r.json();assert.equal(body.country,country);assert.equal(body.year,year);assert.ok(body.countries[country]);assert.ok(body.observances.some(x=>x.date===`${year}-${fixed}`));
   assert.equal(new Set(body.observances.map(x=>x.date)).size,body.observances.length);
   for(const x of body.observances){assert.match(x.date,new RegExp(`^${year}-\\d{2}-\\d{2}$`));assert.ok(x.title.trim());assert.ok(['public','religious','observance'].includes(x.kind));}
  }
 });
}
test('holiday date-only projection remains stable across positive/negative timezones and DST',()=>{
 for(const[country,locale]of cases){const h=new Holidays(country);h.setLanguages([locale,'en']);let expected;
  for(const timezone of ['UTC','Europe/Warsaw','America/Los_Angeles','Pacific/Kiritimati']){h.setTimezone(timezone);const dates=buildCalendarObservances(h.getHolidays(2026),country,2026,locale).map(x=>[x.date,x.title,x.kind]);if(expected)assert.deepEqual(dates,expected);else expected=dates;}
 }
});
test('actual calendar API preserves locale/country fallback and rejects invalid years',async()=>{
 for(const year of ['1969','2101','not-a-year'])assert.equal((await GET(new Request(`http://localhost/api/calendar/observances?year=${year}`))).status,400);
 for(const year of [1970,2100])assert.equal((await GET(new Request(`http://localhost/api/calendar/observances?year=${year}&country=PL&locale=pl`))).status,200);
 const fallback=await (await GET(new Request('http://localhost/api/calendar/observances?year=2026&country=INVALID&locale=unknown'))).json();assert.equal(fallback.country,'GB');
 const uk=await (await GET(new Request('http://localhost/api/calendar/observances?year=2026&locale=uk-UA'))).json();assert.equal(uk.country,'UA');assert.ok(uk.observances.some(x=>x.title==='Новий Рік'));
});
