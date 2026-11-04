"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cardClass, primaryButton, secondaryButton } from "@/components/buttons";
import { endingLine, freshWeek, loadPlaySetup, monthLabel, operatingYear, playDay, promoCost, setPlayPrice, stockCost, type PlayDay, type PlaySetup, type PriceLevel } from "@/lib/play";
import { formatMan } from "@/lib/simulate";


export function ShopGame() {
  const [setup, setSetup] = useState<PlaySetup | null | undefined>(undefined);

  useEffect(() => {
    setSetup(loadPlaySetup());
  }, []);

  if (setup === undefined) return <p className="text-sm text-muted">가게를 준비하는 중입니다.</p>;
  if (!setup) {
    return (
      <section className={`${cardClass} p-5 sm:p-6`}>
        <h1 className="font-display text-4xl">가게가 없습니다</h1>
        <p className="mt-3 text-sm leading-7">대화에서 지역과 예산을 고르고 안내가 끝난 뒤 시작할 수 있습니다.</p>
        <Link href="/chat" className={`${primaryButton} mt-5`}>
          대화로 돌아가기
        </Link>
      </section>
    );
  }

  return <Week key={`${setup.shopName}|${setup.place}|${setup.budget}|${setup.dong}`} setup={setup} />;
}

const PAGE_SIZE = 10;

function Week({ setup }: { setup: PlaySetup }) {
  const [day, setDay] = useState<PlayDay>(() => freshWeek(setup));
  const [page, setPage] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const endedKey = day.over ? `${day.month}|${day.cash}|${day.broke}` : "";

  useEffect(() => {
    if (endedKey) setResultOpen(true);
  }, [endedKey]);
  const pages = Math.max(1, Math.ceil(day.notes.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const from = safePage * PAGE_SIZE;
  const shown = day.notes.slice(from, from + PAGE_SIZE);
  const newest = day.notes[0] ?? "";

  useEffect(() => {
    setPage(0);
  }, [newest, day.notes.length]);
  const where = setup.dong ? `${setup.place} ${setup.dong}` : setup.place;
  const voice = setup.voice;
  const done = day.over;
  const year = operatingYear(day.month);
  const when = monthLabel(day.month);
  const prices: Array<{ id: PriceLevel; label: string }> = [
    { id: "slim", label: voice.priceLow },
    { id: "fair", label: voice.priceMid },
    { id: "hearty", label: voice.priceHigh },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-b">창업 게임</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">{setup.shopName}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {where} · {setup.largeName} {setup.industry} · {voice.offerLabel} {voice.offerName}
          </p>
        </div>
        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gold">{done ? (day.broke ? "가게를 닫았습니다" : "5년 · 계속 영업") : when}</p>
              <p className="mt-1 text-sm">{year}년차 · {((day.month - 1) % 12) + 1}개월 · 5년 중 {day.month}개월째</p>
              <ol className="mt-2 flex gap-1" aria-label="5년 진행">
                {[1, 2, 3, 4, 5].map((item) => (
                  <li key={item} className="flex-1">
                    <span className={`block h-2 border-2 border-ink ${item < year || (done && !day.broke) ? "bg-b" : item === year ? "bg-gold" : "bg-card"}`} />
                    <span className="mt-1 block text-xs">{item}년</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-2xl font-semibold">통장 {formatMan(day.cash)}</p>
            </div>
            <section aria-label="재고 및 영업현황" className="min-w-56 border-4 border-ink bg-gold px-4 py-3 text-ink shadow-[6px_6px_0_#1c1612]">
              <h2 className="text-lg font-semibold">재고 및 영업현황</h2>
              <p className="mt-2 text-3xl font-semibold leading-tight">{voice.stockNoun} {day.stock}{voice.stockUnit}</p>
              <p className="mt-1 text-3xl font-semibold leading-tight">{voice.regularNoun} {day.regulars}곳</p>
            </section>
          </div>
          {done ? null : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button type="button" className={primaryButton} onClick={() => setDay((current) => playDay(setup, current, "open"))}>
                {voice.openButton}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setDay((current) => playDay(setup, current, "stock"))}>
                {voice.stockButton} · {formatMan(stockCost(setup))}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setDay((current) => playDay(setup, current, "promo"))}>
                {voice.promoButton} · {formatMan(promoCost(setup))}
              </button>
            </div>
          )}
          <ul className="mt-4 flex flex-col gap-2">
            {shown.map((line, index) => (
              <li key={`${from + index}-${line}`} className="border-2 border-ink bg-paper px-3 py-2 text-sm leading-6">
                {line}
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" className={secondaryButton} disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
                이전 기록
              </button>
              <p className="text-sm">{from + 1}–{Math.min(day.notes.length, from + PAGE_SIZE)} / {day.notes.length}개</p>
              <button type="button" className={secondaryButton} disabled={safePage <= 0} onClick={() => setPage(Math.max(0, safePage - 1))}>
                최근 기록
              </button>
            </div>
          ) : null}
          {done && resultOpen ? (
            <ResultDialog
              title={day.broke ? "가게를 닫았습니다" : "5년을 영업했습니다"}
              when={when}
              cash={day.cash}
              line={endingLine(setup, day)}
              onClose={() => setResultOpen(false)}
              onAgain={() => setDay(freshWeek(setup))}
            />
          ) : null}
          {done && !resultOpen ? (
            <div className="mt-5 flex flex-col gap-3">
              <button type="button" className={primaryButton} onClick={() => setDay(freshWeek(setup))}>
                같은 조건으로 다시
              </button>
              <Link href="/chat" className={secondaryButton}>
                대화로 돌아가기
              </Link>
            </div>
          ) : null}
          {done ? null : (
            <>
              <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={voice.priceGroup}>
                {prices.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`border-2 border-ink px-3 py-2 text-sm font-semibold ${day.price === item.id ? "bg-ink text-paper" : "bg-card"}`}
                    onClick={() => setDay((current) => setPlayPrice(setup, current, item.id))}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <aside className={`${cardClass} flex flex-col gap-2 p-4 text-sm leading-6 lg:sticky lg:top-6`}>
        <p className="font-semibold">가게 세팅</p>
        <p>상호 {setup.shopName}</p>
        <p>업종 {setup.largeName} · {setup.industry}</p>
        <p>위치 {where}</p>
        <p>평수 {setup.pyeong}평 · {voice.capacityLabel} {voice.capacity}</p>
        <p>영업 {voice.hours}</p>
        <p>{voice.offerLabel} {voice.offerName}</p>
        <p>총예산 {formatMan(setup.budget)}</p>
        <p>계약 {setup.contract}</p>
        <p>시세 월세 {formatMan(setup.areaRent)}</p>
        <p>월세 보증금 {formatMan(setup.deposit)}</p>
        <p>전세 보증금 {formatMan(setup.jeonse)}</p>
        <p>매매가 {formatMan(setup.salePrice)}</p>
        <p>인테리어 {formatMan(setup.interiorCost)}</p>
        <p>시작 운영비 {formatMan(setup.cash)}</p>
        <p>{setup.contract === "월세" ? `한 달 월세 ${formatMan(setup.monthlyRent)}` : `${setup.contract}라 매달 월세는 없습니다`}</p>
        {setup.population != null ? <p>주민등록 {setup.population.toLocaleString("ko-KR")}명</p> : null}
        {setup.storeCount != null ? <p>같은 업종 {setup.storeCount.toLocaleString("ko-KR")}곳</p> : null}
        <p className="text-muted">이름과 하는 일은 고른 업종에 맞춰 정했습니다.</p>
      </aside>
    </div>
  );
}

function ResultDialog({ title, when, cash, line, onClose, onAgain }: { title: string; when: string; cash: number; line: string; onClose: () => void; onAgain: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="play-result-title" className={`${cardClass} w-full max-w-md p-5`} onClick={(event) => event.stopPropagation()}>
        <h2 id="play-result-title" className="text-xl font-semibold leading-snug">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6">{when} · 통장 {formatMan(cash)}</p>
        <p className="mt-2 text-sm leading-7">{line}</p>
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" className={primaryButton} onClick={onAgain}>
            같은 조건으로 다시
          </button>
          <Link href="/chat" className={secondaryButton}>
            대화로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
