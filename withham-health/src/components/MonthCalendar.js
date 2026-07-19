import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getLocalDateString, getMonthDayMarks } from '../database/db';

const BG = '#FDFBF7';
const CARD = '#F5EFE6';
const FG = '#4A4A4A';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * @param {{ petId: 'funu'|'mumu', reloadToken?: number }} props
 */
export function MonthCalendar({ petId, reloadToken = 0 }) {
  const today = getLocalDateString();
  const initial = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [marks, setMarks] = useState({});
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setMarks(await getMonthDayMarks(petId, year, month));
    } catch (e) {
      console.error('[MonthCalendar]', e);
      setMarks({});
    }
  }, [petId, year, month]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const shiftMonth = (delta) => {
    let y = year;
    let m = month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
    setSelected(null);
  };

  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey = selected
    ? `${year}-${String(month).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    : null;
  const selectedMark = selectedKey ? marks[selectedKey] : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} activeOpacity={0.85}>
          <Text style={styles.nav}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {year}年{month}月
        </Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} activeOpacity={0.85}>
          <Text style={styles.nav}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day == null) {
            return <View key={`e-${idx}`} style={styles.cell} />;
          }
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const mark = marks[key];
          const isToday = key === today;
          const isSelected = day === selected;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.cell,
                mark?.hasActivity && styles.cellActive,
                isSelected && styles.cellSelected,
              ]}
              onPress={() => setSelected(day)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.dayNum,
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                {day}
              </Text>
              <View style={styles.dots}>
                {mark?.hasWeight ? <View style={styles.dotWeight} /> : null}
                {mark?.hasActivity && !mark?.hasWeight ? (
                  <View style={styles.dotActivity} />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.legend}>
        ● 体重あり　・ その他の記録あり　背景: 何らかの記録
      </Text>
      {selectedMark ? (
        <Text style={styles.detail}>
          {selectedKey}
          {selectedMark.hasWeight
            ? ` · 体重 ${selectedMark.weight} g`
            : ' · 体重なし'}
          {selectedMark.hasActivity ? ' · 記録あり' : ''}
        </Text>
      ) : (
        <Text style={styles.detail}>日付をタップすると詳細を表示します</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: BG,
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: FG,
  },
  nav: {
    fontSize: 22,
    fontWeight: '600',
    color: FG,
    paddingHorizontal: 10,
    lineHeight: 28,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    color: FG,
    opacity: 0.55,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 2,
  },
  cellActive: {
    backgroundColor: CARD,
  },
  cellSelected: {
    backgroundColor: '#E8DDD4',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: FG,
  },
  dayToday: {
    textDecorationLine: 'underline',
  },
  daySelected: {
    fontWeight: '800',
  },
  dots: {
    height: 6,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dotWeight: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: FG,
  },
  dotActivity: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: `${FG}88`,
  },
  legend: {
    marginTop: 8,
    fontSize: 11,
    color: FG,
    opacity: 0.65,
    lineHeight: 15,
  },
  detail: {
    marginTop: 4,
    fontSize: 12,
    color: FG,
    opacity: 0.8,
    lineHeight: 17,
  },
});
