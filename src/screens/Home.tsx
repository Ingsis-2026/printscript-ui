import {withNavbar} from "../components/navbar/withNavbar.tsx";
import {SnippetTable} from "../components/snippet-table/SnippetTable.tsx";
import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {SnippetDetail} from "./SnippetDetail.tsx";
import {Drawer} from "@mui/material";
import {useGetSnippets} from "../utils/queries.tsx";
import {SnippetFilters} from "../utils/snippet.ts";
import {usePaginationContext} from "../contexts/paginationContext.tsx";
import useDebounce from "../hooks/useDebounce.ts";

const HomeScreen = () => {
  const {id: paramsId} = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [snippetName, setSnippetName] = useState('');
  const [snippetId, setSnippetId] = useState<string | null>(null)
  const [filters, setFilters] = useState<SnippetFilters>({relation: 'ALL'})
  const {page, page_size, count, handleChangeCount, handleGoToPage} = usePaginationContext()
  const {data, isLoading} = useGetSnippets(page, page_size, snippetName, filters)

  // A filter that finds no snippets also has to update the count, so 0 counts too.
  useEffect(() => {
    if (data && data.count != count) {
      handleChangeCount(data.count)
    }
  }, [count, data, handleChangeCount]);


  useEffect(() => {
    if (paramsId) {
      setSnippetId(paramsId);
    }
  }, [paramsId]);

  const handleCloseModal = () => setSnippetId(null)

  // DeBounce Function
  useDebounce(() => {
        if (searchTerm !== snippetName) handleGoToPage(0)
        setSnippetName(
            searchTerm
        );
      }, [searchTerm], 800
  );

  const handleSearchSnippet = (snippetName: string) => {
    setSearchTerm(snippetName);
  };

  // Other filters can have fewer pages than the one on screen: start again from the first.
  const handleChangeFilters = (newFilters: SnippetFilters) => {
    handleGoToPage(0)
    setFilters(newFilters)
  };

  return (
      <>
        <SnippetTable loading={isLoading} handleClickSnippet={setSnippetId} snippets={data?.snippets}
                      handleSearchSnippet={handleSearchSnippet} filters={filters}
                      onChangeFilters={handleChangeFilters}/>
        <Drawer open={!!snippetId} anchor={"right"} onClose={handleCloseModal}>
          {snippetId && <SnippetDetail handleCloseModal={handleCloseModal} id={snippetId}/>}
        </Drawer>
      </>
  )
}

export default withNavbar(HomeScreen);

