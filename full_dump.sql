--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Debian 15.12-0+deb12u2)
-- Dumped by pg_dump version 15.12 (Debian 15.12-0+deb12u2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.purchase DROP CONSTRAINT IF EXISTS fk_purchase_pupil;
ALTER TABLE IF EXISTS ONLY public.purchase DROP CONSTRAINT IF EXISTS fk_purchase_prize;
ALTER TABLE IF EXISTS ONLY public.pupils DROP CONSTRAINT IF EXISTS fk_pupils_form;
ALTER TABLE IF EXISTS ONLY public.purchase DROP CONSTRAINT IF EXISTS purchase_pkey;
ALTER TABLE IF EXISTS ONLY public.pupils DROP CONSTRAINT IF EXISTS pupils_pkey;
ALTER TABLE IF EXISTS ONLY public.prizes DROP CONSTRAINT IF EXISTS prizes_pkey;
ALTER TABLE IF EXISTS ONLY public.form DROP CONSTRAINT IF EXISTS form_pkey;
ALTER TABLE IF EXISTS public.form ALTER COLUMN form_id DROP DEFAULT;
DROP VIEW IF EXISTS public.pupil_remaining_merits;
DROP TABLE IF EXISTS public.pupils;
DROP VIEW IF EXISTS public.prize_stock;
DROP TABLE IF EXISTS public.purchase;
DROP TABLE IF EXISTS public.prizes;
DROP SEQUENCE IF EXISTS public.form_form_id_seq;
DROP TABLE IF EXISTS public.form;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: form; Type: TABLE; Schema: public; Owner: merit_user
--

CREATE TABLE public.form (
    form_id integer NOT NULL,
    form_name character varying(100) NOT NULL,
    form_tutor character varying(100) NOT NULL,
    year_group integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT form_year_group_check CHECK (((year_group >= 0) AND (year_group <= 14)))
);


ALTER TABLE public.form OWNER TO merit_user;

--
-- Name: form_form_id_seq; Type: SEQUENCE; Schema: public; Owner: merit_user
--

CREATE SEQUENCE public.form_form_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.form_form_id_seq OWNER TO merit_user;

--
-- Name: form_form_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: merit_user
--

ALTER SEQUENCE public.form_form_id_seq OWNED BY public.form.form_id;


--
-- Name: prizes; Type: TABLE; Schema: public; Owner: merit_user
--

CREATE TABLE public.prizes (
    prize_id integer NOT NULL,
    description text NOT NULL,
    cost_merits integer NOT NULL,
    cost_money integer NOT NULL,
    image_path character varying(255) NOT NULL,
    total_stocked_ever integer NOT NULL,
    stock_adjustment integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT prizes_cost_merits_check CHECK ((cost_merits >= 0)),
    CONSTRAINT prizes_cost_money_check CHECK ((cost_money >= 0)),
    CONSTRAINT prizes_total_stocked_ever_check CHECK ((total_stocked_ever >= 0))
);


ALTER TABLE public.prizes OWNER TO merit_user;

--
-- Name: purchase; Type: TABLE; Schema: public; Owner: merit_user
--

CREATE TABLE public.purchase (
    purchase_id integer NOT NULL,
    pupil_id integer NOT NULL,
    prize_id integer NOT NULL,
    merit_cost_at_time integer NOT NULL,
    date timestamp without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT purchase_merit_cost_at_time_check CHECK ((merit_cost_at_time >= 0))
);


ALTER TABLE public.purchase OWNER TO merit_user;

--
-- Name: prize_stock; Type: VIEW; Schema: public; Owner: merit_user
--

CREATE VIEW public.prize_stock AS
 SELECT p.prize_id,
    p.description,
    ((p.total_stocked_ever + p.stock_adjustment) - (count(pu.purchase_id))::integer) AS current_stock
   FROM (public.prizes p
     LEFT JOIN public.purchase pu ON (((p.prize_id = pu.prize_id) AND (pu.active = true))))
  WHERE (p.active = true)
  GROUP BY p.prize_id, p.description, p.total_stocked_ever, p.stock_adjustment;


ALTER TABLE public.prize_stock OWNER TO merit_user;

--
-- Name: prizes_prize_id_seq; Type: SEQUENCE; Schema: public; Owner: merit_user
--

ALTER TABLE public.prizes ALTER COLUMN prize_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.prizes_prize_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pupils; Type: TABLE; Schema: public; Owner: merit_user
--

CREATE TABLE public.pupils (
    pupil_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    merits integer NOT NULL,
    form_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT pupils_merits_check CHECK ((merits >= 0))
);


ALTER TABLE public.pupils OWNER TO merit_user;

--
-- Name: pupil_remaining_merits; Type: VIEW; Schema: public; Owner: merit_user
--

CREATE VIEW public.pupil_remaining_merits AS
 SELECT p.pupil_id,
    p.first_name,
    p.last_name,
    (p.merits - COALESCE(sum(pu.merit_cost_at_time), (0)::bigint)) AS remaining_merits
   FROM (public.pupils p
     LEFT JOIN public.purchase pu ON (((p.pupil_id = pu.pupil_id) AND (pu.active = true))))
  WHERE (p.active = true)
  GROUP BY p.pupil_id, p.first_name, p.last_name, p.merits;


ALTER TABLE public.pupil_remaining_merits OWNER TO merit_user;

--
-- Name: pupils_pupil_id_seq; Type: SEQUENCE; Schema: public; Owner: merit_user
--

ALTER TABLE public.pupils ALTER COLUMN pupil_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pupils_pupil_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: merit_user
--

ALTER TABLE public.purchase ALTER COLUMN purchase_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.purchase_purchase_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: form form_id; Type: DEFAULT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.form ALTER COLUMN form_id SET DEFAULT nextval('public.form_form_id_seq'::regclass);


--
-- Data for Name: form; Type: TABLE DATA; Schema: public; Owner: merit_user
--

COPY public.form (form_id, form_name, form_tutor, year_group, active) FROM stdin;
7	Miss Eades	Miss Eades	9	t
8	Mr Allsopp	Mr Allsopp	9	t
9	Mr Clarke	Mr Clarke	8	t
10	Mr Coates	Mr Coates	10	t
11	Mr Duguid	Mr Duguid	8	t
12	Mr Durkan	Mr Durkan	7	t
13	Mr Fatusin	Mr Fatusin	7	t
14	Mr Micklethwait	Mr Micklethwait	9	t
15	Mr Robinson	Mr Robinson	11	t
16	Mrs Hartwell	Mrs Hartwell	7	t
17	Mrs Law	Mrs Law	11	t
18	Mrs Melville	Mrs Melville	8	t
19	Mrs Sarkaria	Mrs Sarkaria	10	t
20	Mrs Stephens  -  Miss Jones	Mrs Stephens  -  Miss Jones	10	t
21	Ms Natha	Ms Natha	11	t
22	Registration group	Registration group	0	t
23	The Pod	The Pod	0	t
\.


--
-- Data for Name: prizes; Type: TABLE DATA; Schema: public; Owner: merit_user
--

COPY public.prizes (prize_id, description, cost_merits, cost_money, image_path, total_stocked_ever, stock_adjustment, active) FROM stdin;
12	Stretchy Smiley Men (Pink)	20	17	/images/1742904714762-186818964-Stretchy Smiley Men PArty Bags Fillers (Pink).png	20	0	t
13	Stretchy Smiley Men (Blue)	20	17	/images/1742904915743-409057848-Stretchy Smiley Men Party Bags Filler (Blue).png	20	0	t
14	Halloween Stretchy Men	15	14	/images/1742905044832-423920652-Stretchy Smiley Men Party Bags Filler (Blue).png	0	0	f
23	Cute Sticky Notes	20	17	/images/1742909280835-630118234-StickyNotes.png	40	0	t
15	Halloween Stretchy Men	15	14	/images/1742905158175-962307804-Halloween Party Bag Fillers.png	50	0	t
24	Bendy Pencil and Eraser	15	14	/images/1742909330406-122764673-BendyPencilEraser.png	62	0	t
8	Rainbow Springs	25	23	/images/1742902723402-779789182-spring.png	30	0	t
16	Magic Snake Cube	40	42	/images/1742905279730-205671511-SONEER 24 Pack Party Bag Fillers.png	24	0	t
9	Sticky Hands	20	20	/images/1742903925811-651637193-Sticky hands.png	30	0	t
10	Sticky Creatures	25	24	/images/1742904196088-589697238-Sticky Creatures.png	36	0	t
11	Stretchy Smiley Men (Yellow)	20	17	/images/1742904452201-716339890-Sretchey Smiley Men Party Bags Fillers.png	20	0	t
19	Math Fidget Spinner	70	67	/images/1742905725703-580943108-AUAUY 18Pcs Math Fidget Spinner.png	18	0	t
25	Liquid Motion Timer	320	320	/images/1742909381561-50829017-hourgalsstimer.png	5	0	t
26	Magnet Fidget	60	58	/images/1742909422542-234279771-magnettoy.png	12	0	t
20	Slingshot Dinosaurs	70	70	/images/1742905990660-814963743-Yumuwind 10PCS Slingshot Dinosaur Finger Toys.png	10	0	t
21	Mini Cube Brain	45	45	/images/1742906291474-303079490-Mini Cube Brain.png	56	0	t
22	Multicoloured Pens	40	40	/images/1742909023183-26308665-colourpens.png	60	0	t
18	Football Fidget Spinners	30	28	/images/1742905605622-142643765-JOYIN 36 Pack Fidget Spinners.png	36	0	t
\.


--
-- Data for Name: pupils; Type: TABLE DATA; Schema: public; Owner: merit_user
--

COPY public.pupils (pupil_id, first_name, last_name, merits, form_id, active) FROM stdin;
31	First name	Last name	0	22	t
32	Riley	ABBOTT	0	12	t
33	Toby	BRADFORD	0	16	t
34	Olivia	CANAVAN	0	13	t
35	Gregor	CARSON	0	13	t
36	Hadi	CHAUDRY	0	12	t
37	Eashan	CHOHAN	0	12	t
38	Kieran	CHOHAN	0	13	t
39	Ethan	CLARK	0	12	t
40	Harry	COLCLOUGH	0	16	t
41	Jack	CUMBERLAND	0	16	t
42	Lewis	DRURY	0	12	t
43	Leah	GILBERT	0	16	t
44	Jack-Joseph	GRIFFITHS	0	13	t
45	Lacey-Mae	HADLAND	0	13	t
46	Hunter	HILL	0	13	t
47	Zac	HOY	0	13	t
48	Noah	HUTCHINSON	0	16	t
49	Kaitlyn-Rose	JONES	0	16	t
50	Max	MALONE	0	13	t
51	Elisia	MUSHING-RIMMER	0	12	t
52	Oscar	NASON	0	12	t
53	Charlie	NEWMAN	0	13	t
54	Alice	PITCHER	0	12	t
55	Tristan	PRINCE	0	13	t
56	Phoenix	PRUE	0	16	t
57	Noah	RANDALL	0	12	t
58	Ruby	REAY	0	12	t
59	Harry	RESTALL	0	16	t
60	Samuel	SANCHEZ-HUSTON	0	16	t
61	Vinay	SUDERA	0	13	t
62	Oliver	TAYLOR	0	16	t
63	Harlee	TURNER	0	12	t
64	Mason	WHEELDON	0	12	t
65	First name	Last name	0	22	t
66	Ali	ABBAS	0	18	t
67	Leo	BURRELL	0	9	t
68	Charlie	COLLINS	0	18	t
69	Ava	CONROY	0	11	t
70	Dominic	DARBY	0	9	t
71	Tony	GEDINA	0	18	t
72	Jessica	GIBBINS	0	11	t
73	Riley	HANSON	0	18	t
74	Amelia-Rose	HARRIS	0	9	t
75	Daniel	HARRISON	0	11	t
76	Joshua	HOMER	0	9	t
77	Kayden	JACQUES	0	18	t
78	Harley	LITTLEWOOD	0	11	t
79	Felix	MACDONALD-BRADLEY	0	11	t
80	Alfie-Johan	MARCER-KANE	0	9	t
81	Luke	MARSTON	0	18	t
82	Flynn	MCCANN	0	11	t
83	Israel	OGUNWA	0	18	t
84	Harry	POWELL	0	9	t
85	Joe	ROSENBACH	0	18	t
86	Archie	STEWART	0	9	t
87	Harry	VAUGHAN	0	9	t
88	Tilly	WING	0	11	t
89	Beatrice	WOOD	0	18	t
90	Eve	WOOD	0	9	t
91	Ruby	WOOD	0	11	t
92	First name	Last name	0	22	t
93	Raees	ALAM	0	8	t
94	Clive	BLACKER	0	7	t
95	Shay	BRANNEN	0	8	t
96	Finlay	BROOKS	0	7	t
97	Melissa	BURKE-HUBBARD	0	14	t
98	Zac	BURKE-HUBBARD	0	8	t
99	Curtis	CHATER	0	7	t
100	Elliott	CLARKE	0	8	t
101	Ashley	CUPPLES-TURNER	0	14	t
102	Euan	FRASER-SMITH	0	14	t
103	Laila	GOURLAY	0	8	t
104	Jack	HOLLIS	0	8	t
105	Reid	HOWARTH	0	14	t
106	India	JACKSON	0	7	t
107	Henry	KAO	0	7	t
108	Tyler	KELLY	0	8	t
109	Areli	KING	0	14	t
110	Orla	KING	0	14	t
111	Kacie	LAMONT	0	14	t
112	Aaron	LINTON	0	8	t
113	Joshua	LUMLEY	0	14	t
114	Jayden	MACK	0	7	t
115	Logan	MADELEY	0	14	t
116	Layton	MANN	0	7	t
117	Seth	MATTHEWS	0	14	t
118	Baydon	MOFFAT	0	7	t
119	Sienna	MULCAHY	0	8	t
120	Jake	PORTAS	0	8	t
121	Jago	POTTER	0	14	t
122	Louis	RUDDOCK	0	7	t
123	Annabel	SOLES	0	14	t
124	Alfie	SOUTHARD	0	8	t
125	Cyprian	SZCZEGIELNIAK	0	8	t
126	Sasha	WALLACE	0	7	t
127	Kitty	WEARING	0	14	t
128	Chloe-Leigh	WESSON	0	8	t
129	Frances	WHITE	0	7	t
130	Henry	WHITE	0	7	t
131	Vanessa	WOJCIK	0	7	t
132	First name	Last name	0	22	t
133	Muhammad	ABDUL-RAHMAN	0	19	t
134	Spencer	AMOS	0	10	t
135	Ellsie	BAGSHAW	0	20	t
136	Kian	BRAY	0	10	t
137	Freddie	BROWN	0	10	t
138	Toby	BUTLER	0	20	t
139	Lauren	COLEMAN	0	23	t
140	Sophie	COLLEY	0	20	t
141	Rowan	CONROY	0	10	t
142	Noah	EDKINS	0	19	t
143	Shaney-Ellis	FLETCHER	0	19	t
144	Faith	GOULD	0	20	t
145	Rayyan	HAMEED	0	20	t
146	Charlie	HAMILTON	0	10	t
147	Carys	HOMER	0	10	t
148	Erin	HORSLEY	0	10	t
149	Haydn	INMAN	0	10	t
150	Henry	JAQUES	0	19	t
151	Samuel	KEMP	0	19	t
152	Roman	LAWRENCE-CHAMBERLAIN	0	19	t
153	Poppy-Leigh	LYDON	0	19	t
154	Harry	MAIR-TILLEY	0	19	t
155	Ana	MCLEAN	0	20	t
156	James	MICHAELSON-YEATES	0	19	t
157	Archie	PARSONS	0	20	t
158	Oliver	POOLE	0	10	t
159	Izzy	PRICE	0	20	t
160	Jamie-Leigh	SIPSON	0	10	t
161	Haresh	SIVASUBRAMANIYAM	0	20	t
162	Charlie	SMITH	0	10	t
163	Lucas	SMITH	0	20	t
164	Ethan	STOPPS	0	19	t
165	Elliot	THOMAS	0	19	t
166	Lily	WHITMARSH	0	20	t
167	First name	Last name	0	22	t
168	Erin	BOER	0	21	t
169	Josh	BRIGGS	0	17	t
170	Leo	BROOKS	0	15	t
171	Eva	BROWN	0	17	t
172	Markus	BURRELL	0	17	t
173	Nuala	COOPER	0	21	t
174	Bella	DOWDING	0	21	t
175	Harry	GREEN	0	17	t
176	Patrick	HENDRY	0	15	t
177	Tyler	HUNT	0	15	t
178	Lucie	HURST	0	17	t
179	Vivien	KOVALOVA	0	21	t
180	Isabella	LEE	0	17	t
181	Oliver	LUCKING	0	17	t
182	Kirath	MANN	0	15	t
183	Harry	MARSHALL	0	15	t
184	Amos	MCGRATTAN	0	21	t
185	Cian	ORME	0	15	t
186	Josiah	PATTERSON	0	21	t
187	Lenny	PAYNE	0	21	t
188	Recy	PERKIN	0	21	t
189	George	REVELL	0	17	t
190	Tabitha	SAYERS	0	21	t
191	Fin	SHAW	0	15	t
192	Destiny	SLATCHER	0	23	t
193	Isobel	SLINN	0	15	t
194	Maddie	STANDLEY	0	15	t
195	Amelia	TANSEY	0	21	t
196	Lexie	TODD	0	17	t
197	Ashton	TOMLINSON	0	21	t
198	Alex	WHEATLEY	0	15	t
199	Grace	WHEELER	0	15	t
200	Charles	WHITE	0	17	t
201	Emmie-May	WILLDIG	0	15	t
202	George	WINFIELD	0	17	t
203	Calum	WRIGHT	0	21	t
204	Alicia	YOUSON	0	15	t
\.


--
-- Data for Name: purchase; Type: TABLE DATA; Schema: public; Owner: merit_user
--

COPY public.purchase (purchase_id, pupil_id, prize_id, merit_cost_at_time, date, active) FROM stdin;
\.


--
-- Name: form_form_id_seq; Type: SEQUENCE SET; Schema: public; Owner: merit_user
--

SELECT pg_catalog.setval('public.form_form_id_seq', 23, true);


--
-- Name: prizes_prize_id_seq; Type: SEQUENCE SET; Schema: public; Owner: merit_user
--

SELECT pg_catalog.setval('public.prizes_prize_id_seq', 26, true);


--
-- Name: pupils_pupil_id_seq; Type: SEQUENCE SET; Schema: public; Owner: merit_user
--

SELECT pg_catalog.setval('public.pupils_pupil_id_seq', 204, true);


--
-- Name: purchase_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: merit_user
--

SELECT pg_catalog.setval('public.purchase_purchase_id_seq', 13, true);


--
-- Name: form form_pkey; Type: CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.form
    ADD CONSTRAINT form_pkey PRIMARY KEY (form_id);


--
-- Name: prizes prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.prizes
    ADD CONSTRAINT prizes_pkey PRIMARY KEY (prize_id);


--
-- Name: pupils pupils_pkey; Type: CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.pupils
    ADD CONSTRAINT pupils_pkey PRIMARY KEY (pupil_id);


--
-- Name: purchase purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.purchase
    ADD CONSTRAINT purchase_pkey PRIMARY KEY (purchase_id);


--
-- Name: pupils fk_pupils_form; Type: FK CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.pupils
    ADD CONSTRAINT fk_pupils_form FOREIGN KEY (form_id) REFERENCES public.form(form_id);


--
-- Name: purchase fk_purchase_prize; Type: FK CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.purchase
    ADD CONSTRAINT fk_purchase_prize FOREIGN KEY (prize_id) REFERENCES public.prizes(prize_id);


--
-- Name: purchase fk_purchase_pupil; Type: FK CONSTRAINT; Schema: public; Owner: merit_user
--

ALTER TABLE ONLY public.purchase
    ADD CONSTRAINT fk_purchase_pupil FOREIGN KEY (pupil_id) REFERENCES public.pupils(pupil_id);


--
-- PostgreSQL database dump complete
--

