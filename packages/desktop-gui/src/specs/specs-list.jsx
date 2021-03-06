import cs from 'classnames'
import _ from 'lodash'
import React, { Component } from 'react'
import { observer } from 'mobx-react'
import Loader from 'react-loader'
import Tooltip from '@cypress/react-tooltip'

import FileOpener from './file-opener'
import ipc from '../lib/ipc'
import projectsApi from '../projects/projects-api'
import specsStore, { allSpecsSpec } from './specs-store'

@observer
class SpecsList extends Component {
  constructor (props) {
    super(props)
    this.filterRef = React.createRef()
  }

  render () {
    if (specsStore.isLoading) return <Loader color='#888' scale={0.5}/>

    if (!specsStore.filter && !specsStore.specs.length) return this._empty()

    return (
      <div className='specs'>
        <header>
          <div className={cs('search', {
            'show-clear-filter': !!specsStore.filter,
          })}>
            <label htmlFor='filter'>
              <i className='fas fa-search' />
            </label>
            <input
              id='filter'
              className='filter'
              placeholder='Search...'
              value={specsStore.filter || ''}
              ref={this.filterRef}
              onChange={this._updateFilter}
              onKeyUp={this._executeFilterAction}
            />
            <Tooltip
              title='Clear search'
              className='browser-info-tooltip cy-tooltip'
            >
              <a className='clear-filter fas fa-times' onClick={this._clearFilter} />
            </Tooltip>
          </div>
          <a onClick={this._selectSpec.bind(this, allSpecsSpec)}
            title="Run all integration specs together"
            className={cs('all-tests', { active: specsStore.isChosen(allSpecsSpec) })}>
            <i className={`fa-fw ${this._allSpecsIcon(specsStore.isChosen(allSpecsSpec))}`} />{' '}
            {allSpecsSpec.displayName}
          </a>
        </header>
        {this._specsList()}
      </div>
    )
  }

  _specsList () {
    if (specsStore.filter && !specsStore.specs.length) {
      return (
        <div className='empty-well'>
          No specs match your search: "<strong>{specsStore.filter}</strong>"
          <br/>
          <a onClick={() => {
            this._clearFilter()
            this.filterRef.current.focus()
          }} className='btn btn-link'>
            <i className='fas fa-times'/> Clear search
          </a>
        </div>
      )
    }

    return (
      <ul className='specs-list list-as-table'>
        {_.map(specsStore.specs, (spec) => this._specItem(spec, 0))}
      </ul>
    )
  }

  _specItem (spec, nestingLevel) {
    return spec.hasChildren ? this._folderContent(spec, nestingLevel) : this._specContent(spec, nestingLevel)
  }

  _allSpecsIcon (allSpecsChosen) {
    return allSpecsChosen ? 'far fa-dot-circle green' : 'fas fa-play'
  }

  _specIcon (isChosen) {
    return isChosen ? 'far fa-dot-circle green' : 'far fa-file'
  }

  _clearFilter = () => {
    const { id, path } = this.props.project

    specsStore.clearFilter({ id, path })
  }

  _updateFilter = (e) => {
    const { id, path } = this.props.project

    specsStore.setFilter({ id, path }, e.target.value)
  }

  _executeFilterAction = (e) => {
    if (e.key === 'Escape') {
      this._clearFilter()
    }
  }

  _selectSpec (spec, e) {
    e.preventDefault()

    const { project } = this.props

    return projectsApi.runSpec(project, spec, project.chosenBrowser)
  }

  _setExpandRootFolder (specFolderPath, isExpanded, e) {
    e.preventDefault()
    e.stopPropagation()

    specsStore.setExpandSpecChildren(specFolderPath, isExpanded)
    specsStore.setExpandSpecFolder(specFolderPath, true)
  }

  _selectSpecFolder (specFolderPath, e) {
    e.preventDefault()

    specsStore.toggleExpandSpecFolder(specFolderPath)
  }

  _folderContent (spec, nestingLevel) {
    const isExpanded = spec.isExpanded

    return (
      <li key={spec.path} className={`folder level-${nestingLevel} ${isExpanded ? 'folder-expanded' : 'folder-collapsed'}`}>
        <div>
          <div className="folder-name" onClick={this._selectSpecFolder.bind(this, spec)}>
            <i className={`folder-collapse-icon fas fa-fw ${isExpanded ? 'fa-caret-down' : 'fa-caret-right'}`} />
            {nestingLevel !== 0 ? <i className={`far fa-fw ${isExpanded ? 'fa-folder-open' : 'fa-folder'}`} /> : null}
            {
              nestingLevel === 0 ?
                <>
                  {spec.displayName} tests
                  {specsStore.specHasFolders(spec) ?
                    <span>
                      <a onClick={this._setExpandRootFolder.bind(this, spec, false)}>collapse all</a>{' | '}
                      <a onClick={this._setExpandRootFolder.bind(this, spec, true)}>expand all</a>
                    </span> :
                    null
                  }
                </> :
                spec.displayName
            }
          </div>
          {
            isExpanded ?
              <div>
                <ul className='list-as-table'>
                  {_.map(spec.children, (spec) => this._specItem(spec, nestingLevel + 1))}
                </ul>
              </div> :
              null
          }
        </div>
      </li>
    )
  }

  _specContent (spec, nestingLevel) {
    const fileDetails = {
      absoluteFile: spec.absolute,
      originalFile: spec.relative,
      relativeFile: spec.relative,
    }

    return (
      <li key={spec.path} className={cs(`file level-${nestingLevel}`, { active: specsStore.isChosen(spec) })}>
        <a href='#' onClick={this._selectSpec.bind(this, spec)} className="file-name-wrapper">
          <div className="file-name">
            <i className={`fa-fw ${this._specIcon(specsStore.isChosen(spec))}`} />
            {spec.displayName}
          </div>
        </a>
        <FileOpener fileDetails={fileDetails} className="file-open-in-ide" />
      </li>
    )
  }

  _empty () {
    return (
      <div className='specs'>
        <div className='empty-well'>
          <h5>
            No files found in
            <code onClick={this._openIntegrationFolder.bind(this)}>
              {this.props.project.integrationFolder}
            </code>
          </h5>
          <a className='helper-docs-link' onClick={this._openHelp}>
            <i className='fas fa-question-circle' />{' '}
              Need help?
          </a>
        </div>
      </div>
    )
  }

  _openIntegrationFolder () {
    ipc.openFinder(this.props.project.integrationFolder)
  }

  _openHelp (e) {
    e.preventDefault()
    ipc.externalOpen('https://on.cypress.io/writing-first-test')
  }
}

export default SpecsList
