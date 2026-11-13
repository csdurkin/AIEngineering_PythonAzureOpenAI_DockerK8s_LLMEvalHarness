// PURPOSE: What models share: the words retrieval used and dropped, and the rules that matched, with a visible line where "sent to the model" stops
// SOURCE: new (heading layout follows Connor's Library app BookDetails.jsx: Typography headings in order)
// AUTHORSHIP: drafted by Claude; reviewed by Connor

import { Fragment } from 'react';
import {
  Typography, Box, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import Section, { SubSection, SURFACE } from './Section.jsx';

//CONSTANTS: colours for the cut-off line and tie marking
const ACCENT = '#2563EB';               // blue accent: the "sent" boundary
const TIE = '#B45309';                  // amber-brown edge on tied rows; tie also has a text label, never colour alone

// Props: caseData (one case from arena-data.json), retrievalMeta (k and min_overlap from meta)
function SharedPanel({ caseData, retrievalMeta }) {

  const { query, retrieval, expected_source: expected } = caseData;
  const sentRows = retrieval.filter((row) => row.sent);
  const hit = expected ? sentRows.some((row) => row.source === expected) : null;
  const expectedRow = retrieval.find((row) => row.source === expected);

  //ROWS SHOWN: only rules that shared at least one word; the expected rule is always kept, so a MISS has its evidence
  const shown = retrieval.filter((row) => row.overlap > 0 || row.source === expected);
  const maxOverlap = Math.max(1, query.kept.length);                  // bar scale: all question words matched = full bar

  //CUT-OFF: the line goes after the last sent row; if nothing was sent, it goes above the first row
  const lastSentRank = sentRows.length ? sentRows[sentRows.length - 1].rank : 0;

  const CutOff = (
    <TableRow aria-hidden="true">
      <TableCell colSpan={4} sx={{ padding: 0, borderBottom: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingY: 0.75 }}>
          <Box sx={{ flex: 1, borderTop: `2px dashed ${ACCENT}` }} />
          <Typography variant="body2" sx={{ color: '#1D4ED8', fontWeight: 600, textAlign: 'center' }}>
            {sentRows.length
              ? `Above: sent to the model (top ${retrievalMeta.k}, ${retrievalMeta.min_overlap}+ shared words) · Below: not sent`
              : `Nothing sent: no rule shared ${retrievalMeta.min_overlap}+ words`}
          </Typography>
          <Box sx={{ flex: 1, borderTop: `2px dashed ${ACCENT}` }} />
        </Box>
      </TableCell>
    </TableRow>
  );

  return (
    <Section eyebrow="Shared input" title="What models share">

      {/* WORDS: side by side on wide screens */}
      <SubSection title="Retrieval words">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ marginBottom: 1.25 }}>Words used</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {query.kept.map((w) => <Chip key={w} label={w} color="primary" size="small" />)}
            </Box>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ marginBottom: 1.25 }}>Words dropped (stop words)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {query.dropped.length
                ? query.dropped.map((w) => <Chip key={w} label={w} variant="outlined" size="small" sx={{ textDecoration: 'line-through' }} />)
                : <Typography variant="body2">none</Typography>}
            </Box>
          </Box>
        </Box>
      </SubSection>

      {/* RULES MATCHED AND SENT: HIT or MISS, then the table with the cut-off line */}
      <SubSection
        title="Rules matched and sent"
        action={expected ? <Chip label={hit ? 'HIT' : 'MISS'} color={hit ? 'success' : 'error'} size="small" /> : null}
      >
        <Typography variant="body1">
          {expected ? (
            <>
              Expected rule: <strong>{expected}</strong>{expectedRow?.title ? `, ${expectedRow.title}` : ''}.
              {!hit && expectedRow ? ` Ranked ${expectedRow.rank} of ${retrieval.length}, sharing ${expectedRow.overlap} word${expectedRow.overlap === 1 ? '' : 's'}.` : ''}
            </>
          ) : (
            caseData.behaviour === 'unknown'
              ? 'No expected rule: this is your own question, so there is no answer key to mark it against.'
              : `No expected rule: this case tests ${caseData.behaviour === 'abstain' ? 'abstaining' : 'refusing'}, not retrieval.`
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ marginTop: 0.5, marginBottom: 2 }}>
          Equal scores keep file order. Showing {shown.length} of {retrieval.length} rules; the rest shared no words.
        </Typography>

        <TableContainer sx={{ ...SURFACE, paddingX: 1 }}>
          <Table size="small" aria-label="Rules that shared words with the question, best match first">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56 }}>Rank</TableCell>
                <TableCell>Rule</TableCell>
                <TableCell>Shared words</TableCell>
                <TableCell sx={{ width: 140 }}>Overlap</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lastSentRank === 0 && CutOff}
              {shown.map((row) => (
                <Fragment key={row.source}>
                  <TableRow
                    sx={{
                      backgroundColor: row.source === expected ? '#FFF7ED' : undefined,               // expected rule: peach
                      boxShadow: row.tie ? `inset 4px 0 0 ${TIE}` : undefined,                        // tied rows: amber edge
                      '& td': { color: row.sent ? 'text.primary' : 'text.secondary' },
                    }}
                  >
                    <TableCell>{row.rank}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <strong>{row.source}</strong>
                        {row.sent && <Chip label="Sent" color="primary" size="small" />}
                        {row.source === expected && <Chip label="Expected" size="small" variant="outlined" />}
                        {row.tie && <Chip label="Tie: file order decided" color="warning" size="small" />}
                      </Box>
                      <Typography variant="body2" color="text.secondary">{row.title}</Typography>
                    </TableCell>
                    <TableCell>{row.matched.length ? row.matched.join(', ') : '-'}</TableCell>
                    <TableCell>
                      {/* OVERLAP: number plus a thin bar, scaled to the number of question words */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ width: 16, textAlign: 'right' }}>{row.overlap}</Box>
                        <Box sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F5F5F4' }}>
                          <Box sx={{ width: `${(row.overlap / maxOverlap) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: row.sent ? ACCENT : '#A8A29E' }} />
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {row.rank === lastSentRank && CutOff}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SubSection>

    </Section>
  );
}

export default SharedPanel;
