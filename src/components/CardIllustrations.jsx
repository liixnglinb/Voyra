import React, { useId } from 'react';

const C = 'var(--art-color)';
const D = 'var(--art-ink)';
const L = 'var(--art-light)';

function Text({ x, y, size = 12, weight = 600, fill = D, children, ...props }) {
  return <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} {...props}>{children}</text>;
}

function Spark({ x, y, size = 9 }) {
  return <path className="sc-art-spark" style={{ '--spark-delay': `${-(x % 7) * .4}s` }} d={`M${x} ${y - size} Q${x} ${y} ${x + size} ${y} Q${x} ${y} ${x} ${y + size} Q${x} ${y} ${x - size} ${y} Q${x} ${y} ${x} ${y - size}`} fill={C} />;
}

function Tick({ x, y, size = 18, color = C, animated = false, index = 0 }) {
  return <path className={animated ? 'sc-check-tick' : undefined} style={animated ? { '--step': index } : undefined} pathLength="1" d={`m${x} ${y} ${size * .32} ${size * .34} ${size * .68} ${-size * .74}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
}

function Relay({ shadow }) {
  return <>
    <ellipse cx="180" cy="140" rx="127" ry="73" fill="none" stroke={C} strokeOpacity=".24" strokeDasharray="4 6" transform="rotate(-25 180 140)" />
    <path className="sc-api-route" d="M88 84 179 139 277 71M179 139 267 202M179 139 74 204" fill="none" stroke={C} strokeOpacity=".45" strokeWidth="2" />
    <circle className="sc-api-packet sc-api-packet-in" cx="88" cy="84" r="4" fill={C} />
    <circle className="sc-api-packet sc-api-packet-out" cx="179" cy="139" r="4" fill={C} />
    <g className="sc-art-main">
      <g filter={shadow}>
        <path d="m180 76 59 33v68l-59 34-59-34v-68z" fill={C} />
        <path d="m180 76 59 33-59 35-59-35z" fill="var(--art-light)" />
        <path d="M180 144v67l59-34v-68z" fill="var(--p-accent)" />
        <path d="m147 139-12 7 12 16m16-17 11 15-11 7" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m203 145 15-9m-15 20 15-9m-15 20 15-9" stroke="white" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
    <g filter={shadow} transform="rotate(-8 76 79)"><rect x="41" y="52" width="78" height="48" rx="14" fill="white" /><image href="/voyraai/brands/openai.svg" x="52" y="65" width="20" height="20" /><Text x="79" y="80" size="12">GPT</Text></g>
    <g filter={shadow} transform="rotate(8 277 73)"><rect x="232" y="46" width="91" height="47" rx="14" fill="white" /><image href="/voyraai/brands/anthropic.svg" x="243" y="61" width="18" height="18" /><Text x="268" y="76" size="11">Claude</Text></g>
    <g className="sc-art-pop" filter={shadow}><rect x="43" y="201" width="157" height="35" rx="11" fill="white" /><circle cx="59" cy="218" r="4" fill={C} /><Text x="71" y="222" size="10" fontFamily="monospace">POST /v1/chat</Text><Text x="164" y="222" size="10">200</Text></g>
    <circle cx="274" cy="203" r="22" fill="white" /><image href="/voyraai/brands/googlegemini.svg" x="262" y="191" width="24" height="24" />
    <Spark x={302} y={139} size={8} /><circle cx="67" cy="150" r="4" fill={C} opacity=".45" />
  </>;
}

function Schedule({ shadow, stage }) {
  return <>
    <circle cx="185" cy="145" r="100" fill="white" fillOpacity=".32" />
    <g className="sc-art-main"><g transform="rotate(-7 174 142)" filter={shadow}>
      <rect x="70" y="54" width="213" height="171" rx="17" fill="white" />
      <path d="M87 54h179q17 0 17 17v29H70V71q0-17 17-17" fill={C} />
      {[105, 245].map(x => <path key={x} d={`M${x} 43v23`} stroke={D} strokeWidth="6" strokeLinecap="round" />)}
      <Text x="89" y="84" size="13" fill="white">WEEKLY PLAN</Text><circle cx="262" cy="79" r="4" fill="white" fillOpacity=".65" />
      {(stage.days || []).map((day, i) => <Text key={day} x={93 + i * 38} y="121" size="10" textAnchor="middle">{day}</Text>)}
      {[0, 1, 2, 3, 4].map((i) => <g key={i}><rect className="sc-calendar-block" style={{ '--step': i }} x={81 + i * 38} y="132" width="24" height={i === 0 ? 62 : 25} rx="6" fill={i === 0 ? C : L} opacity={i === 0 ? 1 : .55} /><rect x={81 + i * 38} y="164" width="24" height="30" rx="6" fill={i % 2 ? L : 'none'} /></g>)}
      <path d="M87 207h77" stroke={L} strokeWidth="2" strokeLinecap="round" />
    </g></g>
    <g className="sc-art-pop" filter={shadow} transform="rotate(5 265 200)"><rect x="192" y="177" width="127" height="55" rx="13" fill="white" /><circle cx="214" cy="204" r="12" fill={L} /><Tick x="208" y="204" size="11" /><Text x="234" y="200" size="10">{stage.events?.[0]?.[1] || '高等数学'}</Text><Text x="234" y="216" size="9" weight="400">{stage.events?.[0]?.[0] || '08:20'} · 课程提醒</Text></g>
    <Spark x={47} y={126} /><Spark x={299} y={63} size={7} />
  </>;
}

function Mall({ shadow }) {
  return <>
    <circle cx="182" cy="145" r="98" fill="white" fillOpacity=".28" />
    <g className="sc-subscription-card" transform="rotate(-13 128 114)" filter={shadow}><rect x="64" y="55" width="125" height="86" rx="13" fill="white" /><image href="/voyraai/brands/openai.svg" x="79" y="72" width="23" height="23" /><Text x="79" y="119" size="12">ChatGPT</Text><circle cx="169" cy="77" r="4" fill={L} /></g>
    <g className="sc-subscription-card sc-subscription-card-second" transform="rotate(10 235 105)" filter={shadow}><rect x="184" y="49" width="112" height="83" rx="13" fill="white" /><image href="/voyraai/brands/googlegemini.svg" x="199" y="63" width="23" height="23" /><Text x="199" y="111" size="12">Gemini</Text></g>
    <g className="sc-art-main" filter={shadow}>
      <path d="M111 117h141l13 109H98z" fill={C} />
      <path d="M252 117h17l14 109h-18z" fill="var(--p-accent)" />
      <path d="M150 127V99a31 31 0 0 1 62 0v28" fill="none" stroke={D} strokeWidth="7" strokeLinecap="round" />
      <path className="sc-mall-star" d="m182 145 6 15 16 2-12 11 4 16-14-9-14 9 4-16-12-11 16-2z" fill="white" />
      <Text x="181" y="211" textAnchor="middle" size="11" fill="white" letterSpacing="3">VOYRA AI</Text>
    </g>
    <g className="sc-art-pop" filter={shadow} transform="rotate(-7 278 192)"><rect x="239" y="171" width="87" height="40" rx="11" fill="white" /><Tick x="252" y="191" size="12" /><Text x="275" y="195" size="10">自动发货</Text></g>
    <Spark x={40} y={161} /><Spark x={307} y={119} size={7} />
  </>;
}

function Health({ shadow, stage }) {
  const [sys, dia] = (stage.focus || '118/76').split('/');
  return <>
    <circle cx="178" cy="144" r="101" fill="none" stroke={C} strokeOpacity=".2" strokeWidth="1.5" />
    <circle cx="178" cy="144" r="80" fill="white" fillOpacity=".25" />
    <path className="sc-health-wave" pathLength="1" d="M39 192h33l10-23 12 39 13-29h24m113 0h20l10-20 12 35 12-20h30" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" opacity=".5" />
    <g className="sc-art-main"><g transform="rotate(-7 173 145)" filter={shadow}>
      <rect x="91" y="61" width="166" height="176" rx="30" fill="white" />
      <rect x="107" y="83" width="134" height="104" rx="16" fill="var(--art-soft)" stroke={L} />
      <Text x="122" y="106" size="9">SYS / DIA</Text><Text x="121" y="146" size="34" weight="750">{sys}<tspan fontSize="23">/{dia}</tspan></Text><Text x="124" y="171" size="9" weight="400">mmHg</Text><Text x="196" y="171" size="10">♥ 72</Text>
      <circle cx="174" cy="212" r="12" fill={C} /><path d="M174 206v7m-4-5a7 7 0 1 0 8 0" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g></g>
    <g className="sc-art-pop" filter={shadow}><circle cx="268" cy="82" r="34" fill={C} /><path className="sc-health-heart" d="M268 98c-9-7-19-15-17-23 2-10 14-11 17-3 4-8 16-7 18 3 2 8-9 17-18 23" fill="white" /></g>
    <Spark x={58} y={91} size={8} /><circle cx="285" cy="222" r="5" fill={C} opacity=".35" />
  </>;
}

function MathModel({ shadow }) {
  return <>
    <path d="M44 183c30-77 91-131 166-113s61 117 106 112" fill="none" stroke={C} strokeOpacity=".25" strokeWidth="2" strokeDasharray="5 6" />
    <g className="sc-art-main"><g transform="rotate(-8 166 139)" filter={shadow}>
      <rect x="81" y="47" width="174" height="185" rx="13" fill="white" /><path d="M110 47v185" stroke={L} />
      {[72, 107, 142, 177, 212].map(y => <rect key={y} x="73" y={y} width="16" height="4" rx="2" fill={C} />)}
      <Text x="125" y="78" size="11">MODEL / 01</Text><Text x="125" y="107" size="20" fontFamily="Georgia, serif" fontStyle="italic">min f(x)</Text>
      <path d="M128 191v-66m0 66h102" fill="none" stroke={L} strokeWidth="2" />
      <path className="sc-model-curve" pathLength="1" d="M131 178c21 2 25-41 45-33s20 19 49-14" fill="none" stroke={C} strokeWidth="3" strokeLinecap="round" /><circle className="sc-model-solution" cx="176" cy="145" r="4" fill={C} />
      <Text x="128" y="215" size="9" weight="400">分析 → 建模 → 求解</Text>
    </g></g>
    <g className="sc-art-pop" filter={shadow}><path d="m274 147 35 20v40l-35 20-35-20v-40z" fill={C} /><path d="m274 147 35 20-35 21-35-21z" fill={L} /><path d="M274 188v39l35-20v-40z" fill="var(--p-accent)" /></g>
    <g filter={shadow} transform="rotate(8 281 79)"><rect x="250" y="57" width="64" height="36" rx="10" fill="white" /><Text x="282" y="80" textAnchor="middle" size="17" fontFamily="Georgia, serif">∑ xᵢ</Text></g>
    <Spark x={46} y={109} size={9} />
  </>;
}

function Checkin({ shadow, stage }) {
  const courses = (stage.courses || []).slice(0, 3);
  return <>
    <circle cx="185" cy="142" r="99" fill="white" fillOpacity=".3" />
    <g className="sc-art-main"><g filter={shadow} transform="rotate(-7 177 143)">
      <rect x="90" y="48" width="175" height="187" rx="17" fill={C} /><rect x="101" y="59" width="153" height="164" rx="10" fill="white" />
      <rect x="143" y="39" width="69" height="26" rx="9" fill={D} /><rect x="161" y="46" width="32" height="6" rx="3" fill={L} />
      <Text x="119" y="93" size="12">课程签到</Text><Text x="235" y="93" textAnchor="end" size="9">AUTO</Text>
      {courses.map(([name], i) => <g key={name}><circle cx="131" cy={121 + i * 35} r="10" fill={L} /><Tick x="126" y={121 + i * 35} size="10" animated index={i} /><Text x="150" y={125 + i * 35} size="11">{name}</Text><path d={`M150 ${137 + i * 35}h74`} stroke={L} /></g>)}
    </g></g>
    <g className="sc-art-pop" filter={shadow}><path className="sc-check-cursor" d="m256 172 1 59 17-15 16 19 11-10-16-18 22-9z" fill={D} stroke="white" strokeWidth="3" strokeLinejoin="round" /><rect x="36" y="180" width="99" height="37" rx="12" fill="white" /><circle className="sc-listening-dot" cx="52" cy="198" r="4" fill={C} /><Text x="63" y="202" size="10">后台监听中</Text></g>
    <Spark x={52} y={77} size={9} /><Spark x={300} y={108} size={7} />
  </>;
}

function Toolbox({ shadow }) {
  return <>
    <circle cx="178" cy="145" r="97" fill="white" fillOpacity=".3" />
    <g transform="rotate(8 213 119)" filter={shadow}><rect x="135" y="64" width="149" height="130" rx="13" fill="white" /><path d="M153 86h74m-74 13h108m-108 13h94" stroke={L} strokeWidth="5" strokeLinecap="round" /></g>
    <g className="sc-art-main" filter={shadow}>
      <path d="M63 112q0-12 12-12h55l18 18h125v100H63z" fill="var(--p-accent)" />
      <path d="M63 129h215l-13 94H75z" fill={C} /><path d="M75 223h190" stroke={D} strokeOpacity=".2" strokeWidth="2" />
      <rect x="96" y="155" width="74" height="35" rx="10" fill="white" fillOpacity=".8" /><Text x="132" y="177" size="12" textAnchor="middle">CLEAN UP</Text>
    </g>
    <g className="sc-art-pop"><g className="sc-clean-broom"><g filter={shadow} transform="rotate(22 268 180)"><rect x="258" y="112" width="14" height="82" rx="7" fill={D} /><path d="M250 174h30l12 48h-54z" fill="white" /><path d="m250 186-3 29m17-29v29m13-29 4 29" stroke={L} strokeWidth="3" strokeLinecap="round" /></g></g></g>
    <Spark x={63} y={62} size={13} /><Spark x={309} y={141} size={8} /><Spark x={202} y={41} size={6} />
    <g filter={shadow}><rect x="45" y="220" width="119" height="28" rx="10" fill="white" /><Text x="105" y="238" size="9" textAnchor="middle">先预览，再安心清理</Text></g>
  </>;
}

function BillTrace({ shadow, stage }) {
  return <>
    <circle cx="176" cy="146" r="96" fill="white" fillOpacity=".3" />
    <g className="sc-art-main"><g filter={shadow} transform="rotate(-10 149 143)">
      <rect x="85" y="32" width="131" height="211" rx="25" fill={D} /><rect x="92" y="39" width="117" height="197" rx="19" fill="white" /><rect x="127" y="44" width="47" height="10" rx="5" fill={D} />
      <Text x="107" y="82" size="10">今日支出</Text><Text x="107" y="115" size="24" weight="750">{stage.focus || '¥39.80'}</Text>
      <path d="M109 128h82" stroke={L} />
      {(stage.bills || []).slice(0, 2).map(([name, , amount], i) => <g className="sc-bill-row" style={{ '--step': i }} key={name}><circle cx="117" cy={151 + i * 35} r="10" fill={L} /><Text x="134" y={149 + i * 35} size="9">{name}</Text><Text x="134" y={162 + i * 35} size="9" weight="400">{amount}</Text></g>)}
      <rect x="135" y="221" width="32" height="3" rx="2" fill={L} />
    </g></g>
    <g className="sc-art-pop sc-receipt" filter={shadow} transform="rotate(9 251 165)"><path d="M211 105h91v109l-9-5-9 5-9-5-9 5-9-5-9 5-9-5-9 5-9-5-10 5z" fill="white" /><Text x="225" y="130" size="9">PAYMENT</Text><path d="M225 144h62m-62 11h50m-50 11h58" stroke={L} strokeWidth="3" strokeLinecap="round" /><Text x="225" y="192" size="14">自动记一笔</Text></g>
    <g className="sc-bill-coin"><circle cx="265" cy="65" r="20" fill={C} /><Text x="265" y="72" size="21" fill="white" textAnchor="middle">¥</Text></g><Spark x={47} y={163} size={8} />
  </>;
}

function Token({ shadow, stage }) {
  return <>
    <circle cx="185" cy="144" r="99" fill="white" fillOpacity=".3" />
    <g className="sc-art-main"><g transform="rotate(-6 173 147)" filter={shadow}>
      <rect x="58" y="77" width="231" height="151" rx="17" fill="white" /><circle cx="76" cy="94" r="3" fill={C} /><circle cx="87" cy="94" r="3" fill={L} /><circle cx="98" cy="94" r="3" fill={L} />
      <Text x="79" y="122" size="9">TOKEN USAGE</Text><Text x="79" y="154" size="29" weight="750">{stage.focus || '1.37'}<tspan fontSize="16"> M</tspan></Text><Text x="258" y="147" size="9" textAnchor="end">本机统计</Text>
      <path d="M79 205h189m-189-23h189m-189-23h189" stroke={L} strokeOpacity=".5" />
      <path d="m80 201 23-10 23 5 25-21 20 7 25-27 24 10 23-18 24-4v62H80z" fill={L} fillOpacity=".55" /><path className="sc-token-line" pathLength="1" d="m80 201 23-10 23 5 25-21 20 7 25-27 24 10 23-18 24-4" fill="none" stroke={C} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle className="sc-token-dot" cx="267" cy="143" r="5" fill={C} stroke="white" strokeWidth="2" />
    </g></g>
    <g className="sc-art-pop" filter={shadow}><rect x="221" y="37" width="91" height="78" rx="15" fill="white" /><circle cx="267" cy="72" r="22" fill="none" stroke={L} strokeWidth="6" /><circle className="sc-token-ring" pathLength="100" cx="267" cy="72" r="22" fill="none" stroke={C} strokeWidth="6" strokeDasharray="68 100" transform="rotate(-90 267 72)" strokeLinecap="round" /><Text x="267" y="76" size="11" textAnchor="middle">68%</Text><Text x="267" y="104" size="8" textAnchor="middle">缓存命中</Text></g>
    <Spark x={48} y={65} size={8} /><circle cx="306" cy="194" r="4" fill={C} opacity=".4" />
  </>;
}

function Chronicle({ shadow, stage }) {
  return <>
    <path d="M50 196c38-77 8-125 82-129s117 36 151 16 39 96-9 131" fill="none" stroke={C} strokeOpacity=".3" strokeWidth="2" strokeDasharray="5 6" />
    <g transform="rotate(6 197 144)" filter={shadow}><rect x="99" y="59" width="183" height="164" rx="15" fill={L} /></g>
    <g className="sc-art-main"><g transform="rotate(-6 176 141)" filter={shadow}>
      <rect x="76" y="47" width="194" height="177" rx="15" fill="white" /><Text x="94" y="75" size="11">MY AI JOURNAL</Text><rect x="222" y="62" width="32" height="15" rx="6" fill={L} /><Text x="238" y="73" size="8" textAnchor="middle">12 源</Text>
      <path d="M107 96v100" stroke={L} strokeWidth="2" />
      {(stage.trace || []).slice(0, 3).map(([time, event], i) => <g className="sc-timeline-step" style={{ '--step': i }} key={time}><circle cx="107" cy={106 + i * 38} r="5" fill={i === 2 ? D : C} stroke="white" strokeWidth="2" /><Text x="122" y={102 + i * 38} size="8" weight="400">{time}</Text><Text x="122" y={118 + i * 38} size="10">{event}</Text></g>)}
      <path d="M95 207h127" stroke={L} />
    </g></g>
    <g className="sc-art-pop" filter={shadow} transform="rotate(10 285 188)"><rect x="242" y="158" width="76" height="65" rx="14" fill={C} /><path d="m260 179-7 7 7 7m39-14 7 7-7 7m-16-17-7 29" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path className="sc-code-caret" d="M269 210h18" stroke="white" strokeWidth="2" strokeLinecap="round" /></g>
    <Spark x={48} y={111} size={9} /><Spark x={298} y={63} size={7} />
  </>;
}

const SCENES = { api: Relay, timetable: Schedule, 'voyraai-mall': Mall, health: Health, mathmodel: MathModel, checkin: Checkin, toolbox: Toolbox, billtrace: BillTrace, token: Token, chronicle: Chronicle };

/** Local vector artwork stays sharp on mobile and adds no image downloads or animation runtime. */
export function CardIllustration({ card }) {
  const id = `card-art-${useId().replace(/:/g, '')}`;
  const Scene = SCENES[card.id];
  if (!Scene) return null;
  return <svg className="sc-illustration" viewBox="0 0 360 280" aria-hidden="true" focusable="false">
    <defs><filter id={id} x="-35%" y="-35%" width="180%" height="190%" colorInterpolationFilters="sRGB"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="var(--art-ink)" floodOpacity=".13" /></filter></defs>
    <Scene shadow={`url(#${id})`} stage={card.stage || {}} />
  </svg>;
}
