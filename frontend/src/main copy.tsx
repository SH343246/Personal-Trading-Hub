import React from 'react'
import { Button as MUIButton } from '@mui/material'
import { Button as RBButton } from 'react-bootstrap'
import styled from 'styled-components'
import { twMerge } from 'tailwind-merge'
import 'bootstrap/dist/css/bootstrap.min.css'

const Styled = styled.button`
  padding: 0.5rem 1rem;
  background: rebeccapurple;
  color: white;
  border: none;
  border-radius: 0.25rem;
`

export default function LibraryTest() {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      <div>
      </div>
      <div>
        <h2>MUI</h2>
        <MUIButton variant="contained">MUI</MUIButton>
      </div>
      <div>
        <h2>Chakra</h2>
      
      </div>
      <div>
        
      </div>
      <div>
        <h2>React-Bootstrap</h2>
        <RBButton variant="success">RB</RBButton>
      </div>
      <div>
        <h2>Styled-Components</h2>
        <Styled>Styled</Styled>
      </div>
      <div>
        <h2>Tailwind + merge</h2>
        <button
          className={twMerge(
            'px-4 py-2 bg-blue-500 text-white rounded',
            'hover:bg-blue-600'
          )}
        >
          Tailwind
        </button>

        <div className="p-4 bg-green-200">
  If you see this green box, Tailwind is working!
</div>
      </div>
    </div>
  )
}
